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
  // same person doesn't show up as multiple "students". Also track whether
  // any row for that student had a null course_id (= unrestricted access to
  // all their courses), since that signal is needed below and isn't
  // otherwise recoverable once collapsed.
  const byStudent = new Map();
  const unrestricted = new Set();
  for (const row of data) {
    if (row.course_id === null) unrestricted.add(row.student_id);
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

  const avgProgressPercent = await computeAvgProgressPercent(req.supabase, byStudent, unrestricted);

  res.json({ students: Array.from(byStudent.values()), avgProgressPercent });
});

// Average lesson-completion percentage across all of a tutor's assigned
// students, respecting the same "unrestricted vs specific courses" scoping
// rule as getStudentOverview below — a tutor's dashboard stat shouldn't leak
// progress on courses they aren't actually assigned to mentor.
async function computeAvgProgressPercent(supabase, byStudent, unrestricted) {
  const studentIds = Array.from(byStudent.keys());
  if (studentIds.length === 0) return null;

  const [enrollmentsRes, progressRes] = await Promise.all([
    supabase.from('enrollments').select('student_id, course_id').in('student_id', studentIds),
    supabase
      .from('progress')
      .select('student_id, status, lessons ( id, module_id, modules ( course_id ) )')
      .in('student_id', studentIds)
      .eq('status', 'completed'),
  ]);

  if (enrollmentsRes.error) throw new ApiError(403, enrollmentsRes.error.message);
  if (progressRes.error) throw new ApiError(403, progressRes.error.message);

  const isAllowed = (studentId, courseId) =>
    unrestricted.has(studentId) || byStudent.get(studentId).course_ids.includes(courseId);

  const enrollments = enrollmentsRes.data.filter((e) => isAllowed(e.student_id, e.course_id));
  const courseIds = Array.from(new Set(enrollments.map((e) => e.course_id)));
  if (courseIds.length === 0) return null;

  const { data: lessonRows, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, modules!inner ( course_id )')
    .in('modules.course_id', courseIds);
  if (lessonsError) throw new ApiError(403, lessonsError.message);

  const lessonCountByCourse = new Map();
  for (const l of lessonRows) {
    const cid = l.modules.course_id;
    lessonCountByCourse.set(cid, (lessonCountByCourse.get(cid) ?? 0) + 1);
  }

  const completedByStudentCourse = new Map(); // `${studentId}:${courseId}` -> count
  for (const p of progressRes.data) {
    const courseId = p.lessons?.modules?.course_id;
    if (!courseId || !isAllowed(p.student_id, courseId)) continue;
    const key = `${p.student_id}:${courseId}`;
    completedByStudentCourse.set(key, (completedByStudentCourse.get(key) ?? 0) + 1);
  }

  const percentByStudent = new Map();
  for (const e of enrollments) {
    const totalLessons = lessonCountByCourse.get(e.course_id) ?? 0;
    if (totalLessons === 0) continue;
    const completed = completedByStudentCourse.get(`${e.student_id}:${e.course_id}`) ?? 0;
    const prev = percentByStudent.get(e.student_id) ?? { completed: 0, total: 0 };
    percentByStudent.set(e.student_id, { completed: prev.completed + completed, total: prev.total + totalLessons });
  }

  const percents = Array.from(percentByStudent.values())
    .filter((s) => s.total > 0)
    .map((s) => (s.completed / s.total) * 100);

  if (percents.length === 0) return null;
  return Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length);
}

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
