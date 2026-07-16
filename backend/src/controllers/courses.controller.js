import multer from 'multer';
import { getAdminClient } from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  const { data, error } = await req.supabase
    .from('courses')
    .select('id, title, slug, description, category, difficulty, thumbnail_url, is_published, created_at, created_by')
    .order('created_at', { ascending: false });

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
  const { error } = await req.supabase.from('courses').delete().eq('id', id);
  if (error) throw new ApiError(403, error.message);
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

  const admin = getAdminClient();
  await ensureThumbnailBucket(admin);

  const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const storagePath = `${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(env.COURSE_THUMBNAILS_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

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
