import crypto from 'node:crypto';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getAdminClient } from '../config/supabaseClient.js';

// ---------- Modules ----------

export const createModule = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, order_index } = req.body;
  if (!title) throw new ApiError(400, 'title is required');

  const { data, error } = await getAdminClient()
    .from('modules')
    .insert({ course_id: courseId, title, description, order_index: order_index ?? 0 })
    .select()
    .single();

  if (error) throw new ApiError(400, error.message);
  res.status(201).json({ module: data });
});

export const updateModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getAdminClient()
    .from('modules')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new ApiError(400, error?.message || 'Update not allowed');
  res.json({ module: data });
});

export const deleteModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await getAdminClient().from('modules').delete().eq('id', id);
  if (error) throw new ApiError(400, error.message);
  res.status(204).send();
});

// ---------- Lessons ----------

export const createLesson = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const { title, lesson_type, content, video_url, order_index } = req.body;
  if (!title) throw new ApiError(400, 'title is required');

  const { data, error } = await getAdminClient()
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

  if (error) {
    console.error('[createLesson] Supabase error:', error.code, error.message);
    throw new ApiError(400, error.message);
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
    const { data: ratings } = await getAdminClient()
      .from('lab_ratings')
      .select('rating')
      .eq('lab_id', data.lab.id);

    data.lab.avgRating = ratings?.length
      ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
      : null;
    data.lab.totalRatings = ratings?.length ?? 0;
  }

  res.json({ lesson: data });
});

export const updateLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getAdminClient()
    .from('lessons')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new ApiError(400, error?.message || 'Update not allowed');
  res.json({ lesson: data });
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await getAdminClient().from('lessons').delete().eq('id', id);
  if (error) throw new ApiError(400, error.message);
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

  const { data, error } = await getAdminClient()
    .from('labs')
    .upsert(payload, { onConflict: 'lesson_id' })
    .select('id, lesson_id, title, description, instructions, docker_image, max_duration_minutes, cpu_limit, memory_limit_mb, created_at')
    .single();

  if (error) throw new ApiError(400, error.message);
  res.status(201).json({ lab: data });
});

export const deleteLab = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await getAdminClient().from('labs').delete().eq('id', id);
  if (error) throw new ApiError(400, error.message);
  res.status(204).send();
});
