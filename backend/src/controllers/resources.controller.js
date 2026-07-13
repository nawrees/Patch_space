import multer from 'multer';
import { getAdminClient } from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new ApiError(400, 'Only PDF files are accepted'));
    }
    cb(null, true);
  },
}).single('file');

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const listResources = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('lesson_resources')
    .select('id, title, resource_type, mime_type, file_size_bytes, order_index, created_at')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  if (error) throw new ApiError(400, error.message);
  res.json({ resources: data });
});

export const uploadResource = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded (expected multipart field "file")');
  const { lessonId } = req.params;
  const title = req.body.title || req.file.originalname;

  // Resolve the lesson's course. Doing this through req.supabase also
  // confirms (via the lessons_select RLS policy) that the caller can
  // actually see this lesson — staffOnly already restricts by role, this
  // adds "and you own/admin this specific course".
  const { data: lesson, error: lessonError } = await req.supabase
    .from('lessons')
    .select('id, module_id, modules ( course_id )')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) throw new ApiError(404, 'Lesson not found or no access');

  const courseId = lesson.modules.course_id;
  const filename = sanitizeFilename(req.file.originalname);
  const storagePath = `${courseId}/${lessonId}/${Date.now()}_${filename}`;

  const admin = getAdminClient();
  const { error: uploadError } = await admin.storage
    .from(env.LESSON_RESOURCES_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (uploadError) throw new ApiError(500, `Storage upload failed: ${uploadError.message}`);

  const { data: resource, error: insertError } = await admin
    .from('lesson_resources')
    .insert({
      lesson_id: lessonId,
      title,
      resource_type: 'pdf',
      storage_path: storagePath,
      mime_type: req.file.mimetype,
      file_size_bytes: req.file.size,
    })
    .select()
    .single();

  if (insertError) {
    // Roll back the uploaded file if we couldn't record its metadata.
    await admin.storage.from(env.LESSON_RESOURCES_BUCKET).remove([storagePath]);
    throw new ApiError(403, `Could not save resource metadata: ${insertError.message}`);
  }

  res.status(201).json({ resource });
});

export const getResourceSignedUrl = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  // RLS-gated lookup: this row only comes back if the caller is enrolled
  // in the parent course, owns the course, or is an admin. No row -> no URL.
  const { data: resource, error } = await req.supabase
    .from('lesson_resources')
    .select('id, storage_path, title, mime_type')
    .eq('id', resourceId)
    .single();

  if (error || !resource) throw new ApiError(404, 'Resource not found or no access');

  const admin = getAdminClient();
  const expiresIn = 3600; // 1 hour — long enough to read the PDF inline
  const { data: signed, error: signError } = await admin.storage
    .from(env.LESSON_RESOURCES_BUCKET)
    .createSignedUrl(resource.storage_path, expiresIn);

  if (signError) throw new ApiError(500, `Could not create signed URL: ${signError.message}`);

  res.json({
    url: signed.signedUrl,
    expiresIn,
    title: resource.title,
    mimeType: resource.mime_type,
  });
});

export const deleteResource = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: resource, error } = await req.supabase
    .from('lesson_resources')
    .select('id, storage_path')
    .eq('id', id)
    .single();

  if (error || !resource) throw new ApiError(404, 'Resource not found or no access');

  const admin = getAdminClient();
  const { error: deleteError } = await admin.from('lesson_resources').delete().eq('id', id);
  if (deleteError) throw new ApiError(403, deleteError.message);

  await admin.storage.from(env.LESSON_RESOURCES_BUCKET).remove([resource.storage_path]);

  res.status(204).send();
});
