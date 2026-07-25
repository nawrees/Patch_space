import crypto from 'node:crypto';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getAdminClient } from '../config/supabaseClient.js';
import { getLabRatingStats } from '../utils/ratingStats.js';

// Lesson video_url is rendered client-side via bypassSecurityTrustResourceUrl
// (Angular's URL sanitizer is deliberately disabled for it, so it can go into
// an <iframe src>) — restrict it server-side to known embeddable video hosts
// so a lesson can't be pointed at an arbitrary attacker-controlled page.
const ALLOWED_VIDEO_HOSTS = new Set([
  'www.youtube.com', 'youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
  'player.vimeo.com', 'vimeo.com', 'www.vimeo.com',
]);

function isValidVideoUrl(url) {
  if (!url) return true; // no video is fine
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_VIDEO_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

// ---------- Modules ----------

export const createModule = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, order_index } = req.body;
  if (!title) throw new ApiError(400, 'title is required');

  // req.supabase (not the admin client) so the modules_write RLS policy
  // enforces that the caller owns (or admins) the parent course — otherwise
  // any tutor could write into any other tutor's course.
  const { data, error } = await req.supabase
    .from('modules')
    .insert({ course_id: courseId, title, description, order_index: order_index ?? 0 })
    .select()
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Not allowed');
  res.status(201).json({ module: data });
});

export const updateModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await req.supabase
    .from('modules')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Update not allowed');
  res.json({ module: data });
});

export const deleteModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await req.supabase.from('modules').delete().eq('id', id);
  if (error) throw new ApiError(403, error.message);
  res.status(204).send();
});

// ---------- Lessons ----------

export const createLesson = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const { title, lesson_type, content, video_url, order_index } = req.body;
  if (!title) throw new ApiError(400, 'title is required');
  if (!isValidVideoUrl(video_url)) {
    throw new ApiError(400, 'video_url must be an https YouTube or Vimeo link');
  }

  const { data, error } = await req.supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      title,
      lesson_type: lesson_type ?? 'theory',
      content,
      video_url,
      order_index: order_index ?? 0,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[createLesson] Supabase error:', error?.code, error?.message);
    throw new ApiError(403, error?.message || 'Not allowed');
  }
  res.status(201).json({ lesson: data });
});

export const getLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('lessons')
    .select(`
      *,
      lab:labs ( id, title, description, instructions, docker_image, service_port, cpu_limit, memory_limit_mb, max_duration_minutes ),
      lesson_resources ( id, title, resource_type, mime_type, file_size_bytes, order_index )
    `)
    .eq('id', id)
    .single();

  // Same RLS-as-existence-check pattern as getCourse: no row back means
  // either it truly doesn't exist, or the caller isn't enrolled — and we
  // intentionally don't distinguish the two to the client.
  if (error || !data) throw new ApiError(404, 'Lesson not found or no access');

  data.lesson_resources?.sort((a, b) => a.order_index - b.order_index);

  // Attach community difficulty rating to the lab object
  if (data.lab?.id) {
    Object.assign(data.lab, await getLabRatingStats(getAdminClient(), data.lab.id));
  }

  res.json({ lesson: data });
});

export const updateLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if ('video_url' in req.body && !isValidVideoUrl(req.body.video_url)) {
    throw new ApiError(400, 'video_url must be an https YouTube or Vimeo link');
  }
  const { data, error } = await req.supabase
    .from('lessons')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Update not allowed');
  res.json({ lesson: data });
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await req.supabase.from('lessons').delete().eq('id', id);
  if (error) throw new ApiError(403, error.message);
  res.status(204).send();
});

// ---------- Labs (metadata only — Docker container orchestration comes later) ----------

export const upsertLab = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const {
    title,
    description,
    instructions,
    docker_image,
    service_port,
    max_duration_minutes,
    cpu_limit,
    memory_limit_mb,
    flag, // plaintext, only ever used to compute the hash below — never stored or echoed back
  } = req.body;

  if (!title || !docker_image) throw new ApiError(400, 'title and docker_image are required');

  const payload = {
    lesson_id: lessonId,
    title,
    description,
    instructions,
    docker_image,
    service_port: service_port ?? 80,
    max_duration_minutes: max_duration_minutes ?? 60,
    cpu_limit: cpu_limit ?? 1.0,
    memory_limit_mb: memory_limit_mb ?? 512,
  };

  if (flag) {
    payload.flag_hash = crypto.createHash('sha256').update(flag).digest('hex');
  }

  const { data, error } = await req.supabase
    .from('labs')
    .upsert(payload, { onConflict: 'lesson_id' })
    .select('id, lesson_id, title, description, instructions, docker_image, max_duration_minutes, cpu_limit, memory_limit_mb, created_at')
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Not allowed');
  res.status(201).json({ lab: data });
});

export const deleteLab = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await req.supabase.from('labs').delete().eq('id', id);
  if (error) throw new ApiError(403, error.message);
  res.status(204).send();
});
