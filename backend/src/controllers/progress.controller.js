import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { recordActivity } from './streaks.controller.js';

export const getMyProgress = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('progress')
    .select('*, lessons ( id, title, lesson_type, module_id )')
    .eq('student_id', req.user.id);

  if (error) throw new ApiError(400, error.message);
  res.json({ progress: data });
});

// Returns the last actively accessed lesson so the student can resume
// exactly where they left off, including video timestamp.
export const getContinueLearning = asyncHandler(async (req, res) => {
  // Most recently updated in-progress or started lesson
  const { data: lastProgress, error } = await req.supabase
    .from('progress')
    .select(`
      lesson_id, status, video_timestamp_seconds, updated_at,
      lessons (
        id, title, lesson_type, video_url, order_index,
        modules ( id, title, order_index,
          courses ( id, title, slug, thumbnail_url, category, difficulty )
        )
      )
    `)
    .eq('student_id', req.user.id)
    .neq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new ApiError(400, error.message);
  if (!lastProgress) {
    // Fallback: return first lesson of first enrolled course
    const { data: enrollment } = await req.supabase
      .from('enrollments')
      .select('course_id, courses(id, title, slug, thumbnail_url)')
      .eq('student_id', req.user.id)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return res.json({ continueLearning: null, enrollment: enrollment ?? null });
  }

  const lesson = lastProgress.lessons;
  const module = lesson?.modules;
  const course = module?.courses;

  res.json({
    continueLearning: {
      courseId: course?.id,
      courseTitle: course?.title,
      courseThumbnail: course?.thumbnail_url,
      courseCategory: course?.category,
      moduleName: module?.title,
      lessonId: lesson?.id,
      lessonTitle: lesson?.title,
      lessonType: lesson?.lesson_type,
      videoUrl: lesson?.video_url,
      videoTimestamp: lastProgress.video_timestamp_seconds ?? 0,
      status: lastProgress.status,
      lastAccessed: lastProgress.updated_at,
    },
  });
});

export const upsertMyProgress = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { status, score, time_spent_seconds, video_timestamp_seconds } = req.body;

  // Read the current row so we can accumulate time/attempts instead of
  // clobbering them on every call (the frontend may ping this periodically
  // while a lesson is open).
  const { data: existing } = await req.supabase
    .from('progress')
    .select('time_spent_seconds, attempts')
    .eq('student_id', req.user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const patch = {
    student_id: req.user.id,
    lesson_id: lessonId,
  };

  if (status) {
    patch.status = status;
    patch.attempts = (existing?.attempts ?? 0) + 1;
    if (status === 'in_progress') patch.started_at = new Date().toISOString();
    if (status === 'completed') {
      patch.completed_at = new Date().toISOString();
      recordActivity(req.user.id).catch(() => {}); // fire-and-forget
    }
  }
  if (score !== undefined) patch.score = score;
  if (time_spent_seconds) {
    patch.time_spent_seconds = (existing?.time_spent_seconds ?? 0) + time_spent_seconds;
  }
  if (video_timestamp_seconds !== undefined) {
    patch.video_timestamp_seconds = video_timestamp_seconds;
  }

  const { data, error } = await req.supabase
    .from('progress')
    .upsert(patch, { onConflict: 'student_id,lesson_id' })
    .select()
    .single();

  if (error) throw new ApiError(400, error.message);
  res.json({ progress: data });
});

export const getStudentProgress = asyncHandler(async (req, res) => {
  // Gated entirely by RLS: progress_select only returns rows if the caller
  // is this student, that student's assigned tutor, or an admin.
  const { studentId } = req.params;

  const { data, error } = await req.supabase
    .from('progress')
    .select('*, lessons ( id, title, lesson_type, module_id )')
    .eq('student_id', studentId);

  if (error) throw new ApiError(403, error.message);
  res.json({ progress: data });
});
