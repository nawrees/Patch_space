import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(400, error.message);
  res.json({ users: data });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['student', 'tutor', 'admin'].includes(role)) {
    throw new ApiError(400, 'role must be one of: student, tutor, admin');
  }

  // Uses the admin caller's own RLS-scoped client. trg_protect_profile_role
  // on the profiles table only permits this change because the *caller*
  // (checked inside the trigger via their own auth.uid()) is an admin —
  // requireRole('admin') on this route is a courtesy check, the trigger is
  // the actual enforcement.
  const { data, error } = await req.supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Role update not allowed');
  res.json({ user: data });
});

export const assignTutor = asyncHandler(async (req, res) => {
  const { tutorId, studentId, courseId } = req.body;
  if (!tutorId || !studentId) throw new ApiError(400, 'tutorId and studentId are required');

  const { data, error } = await req.supabase
    .from('tutor_assignments')
    .insert({ tutor_id: tutorId, student_id: studentId, course_id: courseId ?? null })
    .select()
    .single();

  if (error) throw new ApiError(400, error.message);
  res.status(201).json({ assignment: data });
});
