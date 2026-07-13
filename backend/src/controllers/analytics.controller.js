import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Drop-off funnel: for each lesson in a course, how many enrolled
// students started it and how many completed it — reveals where students abandon.
export const getDropOff = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Total enrolled students for this course
  const { data: enrollments, error: enrollErr } = await req.supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId);

  if (enrollErr) throw new ApiError(400, enrollErr.message);
  const totalEnrolled = enrollments?.length ?? 0;

  // Full course structure
  const { data: course, error: courseErr } = await req.supabase
    .from('courses')
    .select(`
      id, title,
      modules (
        id, title, order_index,
        lessons ( id, title, lesson_type, order_index )
      )
    `)
    .eq('id', courseId)
    .single();

  if (courseErr || !course) throw new ApiError(404, 'Course not found');

  course.modules?.sort((a, b) => a.order_index - b.order_index);
  course.modules?.forEach(m => m.lessons?.sort((a, b) => a.order_index - b.order_index));

  // All progress rows for this course (via lesson_id membership)
  const allLessonIds = course.modules?.flatMap(m => m.lessons?.map(l => l.id) ?? []) ?? [];

  const { data: progressRows, error: progErr } = await req.supabase
    .from('progress')
    .select('lesson_id, student_id, status')
    .in('lesson_id', allLessonIds);

  if (progErr) throw new ApiError(400, progErr.message);

  // Build per-lesson stats
  const funnel = [];
  let moduleIdx = 0;
  for (const module of course.modules ?? []) {
    moduleIdx++;
    let lessonIdx = 0;
    for (const lesson of module.lessons ?? []) {
      lessonIdx++;
      const rows = progressRows?.filter(p => p.lesson_id === lesson.id) ?? [];
      const started   = rows.length;
      const completed = rows.filter(r => r.status === 'completed').length;
      const inProgress = rows.filter(r => r.status === 'in_progress').length;

      funnel.push({
        moduleTitle: module.title,
        moduleOrder: moduleIdx,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonType: lesson.lesson_type,
        lessonOrder: lessonIdx,
        totalEnrolled,
        started,
        completed,
        inProgress,
        notStarted: totalEnrolled - started,
        completionRate: totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0,
        dropOffRate:    totalEnrolled > 0 ? Math.round(((totalEnrolled - completed) / totalEnrolled) * 100) : 0,
      });
    }
  }

  res.json({ courseTitle: course.title, totalEnrolled, funnel });
});

// Study pace stats for the authenticated student
export const getMyPaceStats = asyncHandler(async (req, res) => {
  const { data: progress, error } = await req.supabase
    .from('progress')
    .select('status, completed_at, started_at, lesson_id')
    .eq('student_id', req.user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: true });

  if (error) throw new ApiError(400, error.message);

  const completed = progress ?? [];
  if (completed.length === 0) {
    return res.json({ paceStats: null });
  }

  const firstDate = new Date(completed[0].completed_at);
  const lastDate  = new Date(completed[completed.length - 1].completed_at);
  const daySpan   = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
  const lessonsPerDay = completed.length / daySpan;

  // Group completions by day for the sparkline
  const byDay = {};
  completed.forEach(p => {
    const day = p.completed_at?.slice(0, 10);
    if (day) byDay[day] = (byDay[day] ?? 0) + 1;
  });

  res.json({
    paceStats: {
      completedLessons: completed.length,
      activeDays: Object.keys(byDay).length,
      lessonsPerDay: Math.round(lessonsPerDay * 10) / 10,
      byDay,
      firstActivity: completed[0].completed_at,
      lastActivity: completed[completed.length - 1].completed_at,
    },
  });
});
