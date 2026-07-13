import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listMyStudents = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('tutor_assignments')
    .select('student_id, course_id, assigned_at, student:student_id ( id, full_name, email )')
    .eq('tutor_id', req.user.id);

  if (error) throw new ApiError(400, error.message);

  // A student can have multiple assignment rows (one per course they're
  // mentored in) — collapse those into a single entry per student so the
  // same person doesn't show up as multiple "students".
  const byStudent = new Map();
  for (const row of data) {
    const existing = byStudent.get(row.student_id);
    if (existing) {
      if (row.course_id) existing.course_ids.push(row.course_id);
      if (new Date(row.assigned_at) < new Date(existing.assigned_at)) existing.assigned_at = row.assigned_at;
    } else {
      byStudent.set(row.student_id, {
        student_id: row.student_id,
        student: row.student,
        assigned_at: row.assigned_at,
        course_ids: row.course_id ? [row.course_id] : [],
      });
    }
  }

  res.json({ students: Array.from(byStudent.values()) });
});

export const getStudentOverview = asyncHandler(async (req, res) => {
  // RLS (is_tutor_of) ensures this only returns data for students actually
  // assigned to this tutor — or anything at all, for an admin.
  const { studentId } = req.params;

  const [enrollmentsRes, progressRes] = await Promise.all([
    req.supabase
      .from('enrollments')
      .select('*, courses ( id, title, slug )')
      .eq('student_id', studentId),
    req.supabase
      .from('progress')
      .select('*, lessons ( id, title, module_id, modules ( course_id ) )')
      .eq('student_id', studentId),
  ]);

  if (enrollmentsRes.error) throw new ApiError(403, enrollmentsRes.error.message);
  if (progressRes.error) throw new ApiError(403, progressRes.error.message);

  let enrollments = enrollmentsRes.data;
  let progress = progressRes.data;

  // Tutors only see progress for the courses they're actually assigned to
  // teach this student — admins see everything. A null course_id on an
  // assignment means "all courses", so it leaves the data unfiltered.
  if (req.profile.role !== 'admin') {
    const { data: assignments, error: assignError } = await req.supabase
      .from('tutor_assignments')
      .select('course_id')
      .eq('tutor_id', req.user.id)
      .eq('student_id', studentId);

    if (assignError) throw new ApiError(403, assignError.message);

    const hasUnrestrictedAccess = assignments.some((a) => a.course_id === null);
    if (!hasUnrestrictedAccess) {
      const allowedCourseIds = new Set(assignments.map((a) => a.course_id));
      enrollments = enrollments.filter((e) => allowedCourseIds.has(e.course_id));
      progress = progress.filter((p) => allowedCourseIds.has(p.lessons?.modules?.course_id));
    }
  }

  res.json({ enrollments, progress });
});
