import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const enrollSelf = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const { data, error } = await req.supabase
    .from('enrollments')
    .insert({ student_id: req.user.id, course_id: courseId })
    .select()
    .single();

  // Common failure: unique(student_id, course_id) violation if already enrolled,
  // or RLS rejection if the course isn't published.
  if (error) throw new ApiError(400, error.message);
  res.status(201).json({ enrollment: data });
});

export const enrollStudent = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.body;
  if (!studentId || !courseId) throw new ApiError(400, 'studentId and courseId are required');

  const { data, error } = await req.supabase
    .from('enrollments')
    .insert({ student_id: studentId, course_id: courseId })
    .select()
    .single();

  if (error) throw new ApiError(400, error.message);
  res.status(201).json({ enrollment: data });
});

export const listMyEnrollments = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('enrollments')
    .select('*, courses ( id, title, slug, thumbnail_url, difficulty )')
    .eq('student_id', req.user.id)
    .order('enrolled_at', { ascending: false });

  if (error) throw new ApiError(400, error.message);
  res.json({ enrollments: data });
});

const ENROLLMENT_STATUSES = new Set(['active', 'completed', 'dropped']);

export const updateEnrollment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Only `status` is settable here — course_id/student_id/completed_at must
  // never come from the client, or a student could retarget their enrollment
  // onto an arbitrary (e.g. unpublished) course, or fabricate a completion
  // date without actually completing any lessons.
  if (!status || !ENROLLMENT_STATUSES.has(status)) {
    throw new ApiError(400, `status must be one of: ${[...ENROLLMENT_STATUSES].join(', ')}`);
  }

  const { data, error } = await req.supabase
    .from('enrollments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Update not allowed');
  res.json({ enrollment: data });
});
