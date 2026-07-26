import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getAdminClient } from '../config/supabaseClient.js';

// A tutor sees only their own grant; the course owner/admin sees every
// grant for their course — course_collaborators_select RLS draws that line,
// no extra filtering needed here.
export const listCollaborators = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const { data, error } = await req.supabase
    .from('course_collaborators')
    .select('course_id, tutor_id, granted_at, tutor:tutor_id ( id, full_name, email ), granter:granted_by ( full_name )')
    .eq('course_id', courseId)
    .order('granted_at', { ascending: false });

  if (error) throw new ApiError(400, error.message);
  res.json({ collaborators: data });
});

// Tutors to show in the "add collaborator" picker: every tutor except the
// course's own owner and whoever already has access. Uses the admin client
// (profiles_select RLS wouldn't let one tutor browse others) so the
// ownership check has to be explicit here, same reasoning as the email
// lookup in grantCollaborator below.
export const listEligibleCollaborators = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const { data: course, error: courseError } = await req.supabase
    .from('courses')
    .select('id, created_by')
    .eq('id', courseId)
    .single();

  if (courseError || !course) throw new ApiError(404, 'Course not found or no access');
  if (course.created_by !== req.user.id && req.profile.role !== 'admin') {
    throw new ApiError(403, 'Only this course\'s owner (or an admin) can manage its access');
  }

  const { data: existing, error: existingError } = await req.supabase
    .from('course_collaborators')
    .select('tutor_id')
    .eq('course_id', courseId);

  if (existingError) throw new ApiError(400, existingError.message);

  const excludeIds = new Set([course.created_by, ...(existing ?? []).map((c) => c.tutor_id)]);

  const { data: tutors, error: tutorsError } = await getAdminClient()
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'tutor')
    .order('full_name', { ascending: true });

  if (tutorsError) throw new ApiError(400, tutorsError.message);

  res.json({ tutors: (tutors ?? []).filter((t) => !excludeIds.has(t.id)) });
});

export const grantCollaborator = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { email } = req.body;
  if (!email?.trim()) throw new ApiError(400, 'email is required');

  // Resolving "which account does this email belong to" has to bypass RLS
  // (profiles_select doesn't let one tutor look up another by email) — the
  // actual authorization happens next, on the insert itself, which uses
  // req.supabase so course_collaborators_insert RLS still enforces that
  // only this course's owner (or an admin) can grant access.
  const { data: target, error: lookupError } = await getAdminClient()
    .from('profiles')
    .select('id, role')
    .ilike('email', email.trim())
    .maybeSingle();

  if (lookupError) throw new ApiError(400, lookupError.message);
  if (!target || target.role !== 'tutor') {
    throw new ApiError(404, 'No tutor account found with that email');
  }
  if (target.id === req.user.id) {
    throw new ApiError(400, "You already own this course — no need to grant yourself access");
  }

  const { data, error } = await req.supabase
    .from('course_collaborators')
    .insert({ course_id: courseId, tutor_id: target.id, granted_by: req.user.id })
    .select('course_id, tutor_id, granted_at, tutor:tutor_id ( id, full_name, email )')
    .single();

  if (error) {
    if (error.code === '23505') throw new ApiError(409, 'That tutor already has access to this course');
    throw new ApiError(403, error.message || 'Not allowed');
  }
  res.status(201).json({ collaborator: data });
});

export const revokeCollaborator = asyncHandler(async (req, res) => {
  const { courseId, tutorId } = req.params;

  const { error } = await req.supabase
    .from('course_collaborators')
    .delete()
    .eq('course_id', courseId)
    .eq('tutor_id', tutorId);

  if (error) throw new ApiError(403, error.message);
  res.status(204).send();
});
