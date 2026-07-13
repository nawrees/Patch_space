import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

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
  const { title, slug, description, category, difficulty } = req.body;
  if (!title || !slug) throw new ApiError(400, 'title and slug are required');

  const { data, error } = await req.supabase
    .from('courses')
    .insert({ title, slug, description, category, difficulty, created_by: req.user.id })
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
