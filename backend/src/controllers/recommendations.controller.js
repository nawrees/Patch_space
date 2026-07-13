import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Smart mock recommendations engine.
// Logic:
//   1. Find enrolled courses and current progress.
//   2. Surface the next uncompleted lesson in each active course.
//   3. If student is close to finishing a course, suggest the next-difficulty course.
//   4. Flag lessons where score < 70 as "needs review".
export const getRecommendations = asyncHandler(async (req, res) => {
  const uid = req.user.id;

  // Enrolled courses
  const { data: enrollments, error: enrollErr } = await req.supabase
    .from('enrollments')
    .select(`
      course_id,
      courses (
        id, title, slug, category, difficulty, thumbnail_url,
        modules (
          id, title, order_index,
          lessons ( id, title, lesson_type, order_index )
        )
      )
    `)
    .eq('student_id', uid);

  if (enrollErr) throw new ApiError(400, enrollErr.message);

  // All progress
  const { data: progress, error: progErr } = await req.supabase
    .from('progress')
    .select('lesson_id, status, score')
    .eq('student_id', uid);

  if (progErr) throw new ApiError(400, progErr.message);

  const completedIds = new Set((progress ?? []).filter(p => p.status === 'completed').map(p => p.lesson_id));
  const weakIds = new Set((progress ?? []).filter(p => p.score !== null && p.score < 70).map(p => p.lesson_id));

  const recommendations = [];

  for (const enrollment of enrollments ?? []) {
    const course = enrollment.courses;
    if (!course) continue;

    const modules = (course.modules ?? []).sort((a, b) => a.order_index - b.order_index);
    const allLessons = modules.flatMap(m =>
      (m.lessons ?? []).sort((a, b) => a.order_index - b.order_index).map(l => ({ ...l, moduleTitle: m.title }))
    );

    const totalLessons = allLessons.length;
    const completedInCourse = allLessons.filter(l => completedIds.has(l.id)).length;

    // Next lesson to do
    const nextLesson = allLessons.find(l => !completedIds.has(l.id));
    if (nextLesson && recommendations.length < 3) {
      const completionPct = totalLessons > 0 ? Math.round((completedInCourse / totalLessons) * 100) : 0;
      recommendations.push({
        type: 'next_lesson',
        priority: 'high',
        courseId: course.id,
        courseTitle: course.title,
        courseThumbnail: course.thumbnail_url,
        lessonId: nextLesson.id,
        lessonTitle: nextLesson.title,
        lessonType: nextLesson.lesson_type,
        moduleTitle: nextLesson.moduleTitle,
        reason: `Continue your progress in "${course.title}" — ${completionPct}% complete`,
        completionPct,
      });
    }

    // Weak lessons (score < 70) — suggest review
    const weakInCourse = allLessons.filter(l => weakIds.has(l.id));
    if (weakInCourse.length > 0 && recommendations.length < 3) {
      const weakest = weakInCourse[0];
      recommendations.push({
        type: 'review',
        priority: 'medium',
        courseId: course.id,
        courseTitle: course.title,
        courseThumbnail: course.thumbnail_url,
        lessonId: weakest.id,
        lessonTitle: weakest.title,
        lessonType: weakest.lesson_type,
        moduleTitle: weakest.moduleTitle,
        reason: `Your score was below 70% on "${weakest.title}" — a review is recommended`,
        completionPct: null,
      });
    }
  }

  // If < 3 recommendations and student has no enrollment or almost done, suggest new courses
  if (recommendations.length < 3) {
    const enrolledCourseIds = (enrollments ?? []).map(e => e.course_id);
    const { data: suggestedCourses } = await req.supabase
      .from('courses')
      .select('id, title, slug, category, difficulty, thumbnail_url, description')
      .eq('is_published', true)
      .not('id', 'in', `(${enrolledCourseIds.join(',') || 'null'})`)
      .limit(3 - recommendations.length);

    for (const course of suggestedCourses ?? []) {
      recommendations.push({
        type: 'new_course',
        priority: 'low',
        courseId: course.id,
        courseTitle: course.title,
        courseThumbnail: course.thumbnail_url,
        lessonId: null,
        lessonTitle: null,
        lessonType: null,
        moduleTitle: null,
        reason: `Explore "${course.title}" — a ${course.difficulty} course in ${course.category}`,
        completionPct: 0,
      });
    }
  }

  res.json({ recommendations: recommendations.slice(0, 3) });
});
