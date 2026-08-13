import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { getAdminClient } from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getLabRatingStatsBatch } from '../utils/ratingStats.js';
import { env } from '../config/env.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Extension is derived from the already-validated mimetype, never from the
// client-supplied filename — the filename could contain path separators
// (e.g. "../../other-course/x") that would otherwise land in the storage
// path unsanitized.
const EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const thumbnailUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, WebP or GIF images are accepted'));
    }
    cb(null, true);
  },
}).single('image');

export const listCourses = asyncHandler(async (req, res) => {
  let query = req.supabase
    .from('courses')
    .select('id, title, slug, description, category, difficulty, thumbnail_url, is_published, created_at, created_by')
    .order('created_at', { ascending: false });

  // ?mine=true is what the "Manage Courses" screen uses — a tutor should
  // only see courses they actually created OR have been granted
  // collaborator access to, not every other tutor's published course,
  // which courses_select RLS otherwise legitimately returns for catalog
  // browsing. Admins manage everything, so the filter is skipped for them.
  if (req.query.mine === 'true' && req.profile?.role !== 'admin') {
    const { data: collabRows, error: collabError } = await req.supabase
      .from('course_collaborators')
      .select('course_id')
      .eq('tutor_id', req.user.id);

    if (collabError) throw new ApiError(400, collabError.message);

    const collabIds = (collabRows ?? []).map((r) => r.course_id);
    query = collabIds.length
      ? query.or(`created_by.eq.${req.user.id},id.in.(${collabIds.join(',')})`)
      : query.eq('created_by', req.user.id);
  }

  const { data, error } = await query;

  if (error) throw new ApiError(400, error.message);
  res.json({ courses: data });
});

export const getCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('courses')
    .select(`
      *,
      modules (
        id, title, description, order_index,
        lessons (
          id, title, lesson_type, video_url, order_index,
          lab:labs ( id, title, description, max_duration_minutes, docker_image, service_port, cpu_limit, memory_limit_mb, instructions ),
          lesson_resources ( id, title, resource_type, mime_type, file_size_bytes, order_index )
        )
      )
    `)
    .eq('id', id)
    .single();

  // If the caller isn't enrolled, isn't the creator, and isn't an admin,
  // RLS simply returns no row — that looks identical to "not found" here,
  // which is the right behavior (don't reveal unpublished courses exist).
  if (error || !data) throw new ApiError(404, 'Course not found or no access');

  // modules/lessons come back unordered by order_index from a nested
  // select — sort client-side here (or let Angular do it) rather than
  // relying on fragile nested .order() chaining.
  data.modules?.sort((a, b) => a.order_index - b.order_index);
  data.modules?.forEach((m) => m.lessons?.sort((a, b) => a.order_index - b.order_index));

  // Attach each lab's community difficulty rating (avg, %, per-level
  // breakdown) in one batched query rather than one per lab.
  const labIds = (data.modules ?? [])
    .flatMap((m) => m.lessons ?? [])
    .map((l) => l.lab?.id)
    .filter(Boolean);
  const ratingStats = await getLabRatingStatsBatch(getAdminClient(), labIds);
  for (const m of data.modules ?? []) {
    for (const l of m.lessons ?? []) {
      if (l.lab?.id) Object.assign(l.lab, ratingStats[l.lab.id]);
    }
  }

  res.json({ course: data });
});

export const createCourse = asyncHandler(async (req, res) => {
  const { title, slug, description, category, difficulty, is_published } = req.body;
  if (!title || !slug) throw new ApiError(400, 'title and slug are required');

  const { data, error } = await req.supabase
    .from('courses')
    .insert({ title, slug, description, category, difficulty, is_published: !!is_published, created_by: req.user.id })
    .select()
    .single();

  if (error) throw new ApiError(400, error.message);
  res.status(201).json({ course: data });
});

export const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('courses')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Update not allowed');
  res.json({ course: data });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // .select() so a delete silently blocked by RLS (e.g. a collaborator who
  // only has edit rights, not delete) can be told apart from a real
  // success — without it this would 204 either way with the row untouched.
  const { data, error } = await req.supabase.from('courses').delete().eq('id', id).select('id');
  if (error) throw new ApiError(403, error.message);
  if (!data?.length) throw new ApiError(403, 'Not allowed');
  res.status(204).send();
});

async function ensureThumbnailBucket(admin) {
  const { error } = await admin.storage.createBucket(env.COURSE_THUMBNAILS_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
  // "already exists" is not an error — anything else is
  if (error && !error.message.toLowerCase().includes('already exist')) {
    throw new ApiError(500, `Storage init failed: ${error.message}`);
  }
}

export const uploadThumbnail = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded (expected multipart field "image")');
  const { id } = req.params;

  // RLS-gated check: confirm caller can write to this course
  const { data: course, error: courseError } = await req.supabase
    .from('courses')
    .select('id')
    .eq('id', id)
    .single();

  if (courseError || !course) throw new ApiError(403, 'Course not found or no access');

  // multer's fileFilter only checked the client-declared Content-Type, which
  // is trivially spoofable — verify the actual file bytes match one of the
  // allowed image formats before it gets stored and re-served publicly.
  const detected = await fileTypeFromBuffer(req.file.buffer);
  if (!detected || !ALLOWED_IMAGE_TYPES.includes(detected.mime)) {
    throw new ApiError(400, 'File content does not match an accepted image format (failed signature check)');
  }

  const admin = getAdminClient();
  await ensureThumbnailBucket(admin);

  const ext = EXTENSION_BY_MIME_TYPE[detected.mime] || 'jpg';
  const storagePath = `${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(env.COURSE_THUMBNAILS_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: detected.mime, upsert: true });

  if (uploadError) throw new ApiError(500, `Storage upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = admin.storage
    .from(env.COURSE_THUMBNAILS_BUCKET)
    .getPublicUrl(storagePath);

  const { data: updated, error: updateError } = await req.supabase
    .from('courses')
    .update({ thumbnail_url: publicUrl })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw new ApiError(500, updateError.message);

  res.json({ course: updated, thumbnail_url: publicUrl });
});
