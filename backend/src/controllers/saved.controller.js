import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getAdminClient } from '../config/supabaseClient.js';

export const getSaved = asyncHandler(async (req, res) => {
  const { data, error } = await getAdminClient()
    .from('saved_courses')
    .select(`
      id,
      created_at,
      course:courses ( id, title, description, category, difficulty, thumbnail_url, is_published )
    `)
    .eq('student_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(500, error.message);
  res.json({ saved: data ?? [] });
});

export const saveCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const { error } = await getAdminClient()
    .from('saved_courses')
    .upsert({ student_id: req.user.id, course_id: courseId }, { onConflict: 'student_id,course_id' });

  if (error) throw new ApiError(500, error.message);
  res.status(201).json({ saved: true });
});

export const unsaveCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const { error } = await getAdminClient()
    .from('saved_courses')
    .delete()
    .eq('student_id', req.user.id)
    .eq('course_id', courseId);

  if (error) throw new ApiError(500, error.message);
  res.json({ saved: false });
});
