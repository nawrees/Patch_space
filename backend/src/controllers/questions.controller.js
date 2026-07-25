import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getAdminClient } from '../config/supabaseClient.js';

// Student: ask a question on a lesson
export const askQuestion = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { question } = req.body;
  if (!question?.trim()) throw new ApiError(400, 'question is required');

  // Resolve course_id from lesson
  const { data: lesson, error: lessonErr } = await req.supabase
    .from('lessons')
    .select('id, modules(course_id)')
    .eq('id', lessonId)
    .single();

  if (lessonErr || !lesson) throw new ApiError(404, 'Lesson not found');
  const courseId = lesson.modules?.course_id;

  const { data, error } = await req.supabase
    .from('questions')
    .insert({ lesson_id: lessonId, course_id: courseId, student_id: req.user.id, question })
    .select()
    .single();

  if (error) throw new ApiError(400, error.message);

  // Notify every tutor assigned to this student for this course (or globally)
  const admin = getAdminClient();
  const { data: assignments } = await admin
    .from('tutor_assignments')
    .select('tutor_id')
    .eq('student_id', req.user.id)
    .or(`course_id.eq.${courseId},course_id.is.null`);

  if (assignments?.length) {
    await admin.from('notifications').insert(
      assignments.map(a => ({
        user_id:     a.tutor_id,
        type:        'question_asked',
        question_id: data.id,
        lesson_id:   lessonId,
        message:     `New question: "${question.trim().slice(0, 80)}"`,
      }))
    );
  }

  res.status(201).json({ question: data });
});

// Student: get their questions for a lesson
export const getLessonQuestions = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  const { data, error } = await req.supabase
    .from('questions')
    .select('*, student:student_id(full_name), answerer:answered_by(full_name)')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(400, error.message);
  res.json({ questions: data });
});

// Tutor/Admin: get all questions they can see, sorted by urgency
export const getAllQuestions = asyncHandler(async (req, res) => {
  const { courseId, unansweredOnly } = req.query;

  let query = req.supabase
    .from('questions')
    .select(`
      *,
      student:student_id ( full_name, email ),
      answerer:answered_by ( full_name ),
      lessons ( title, modules ( title, courses ( title ) ) )
    `)
    .order('created_at', { ascending: true }); // oldest first = highest urgency

  if (courseId) query = query.eq('course_id', courseId);
  // Dismissed questions ("no reply needed") don't need a real answer, so they
  // shouldn't keep counting as unanswered/urgent alongside genuine open ones.
  if (unansweredOnly === 'true') query = query.is('answered_at', null).is('dismissed_at', null);

  const { data, error } = await query;
  if (error) throw new ApiError(400, error.message);

  // Tag urgency: unanswered > 24h is "urgent", 1-24h is "pending", answered
  // is "done", dismissed (marked read without a real answer) is "dismissed".
  const now = Date.now();
  const tagged = (data ?? []).map(q => {
    let urgency;
    if (q.answered_at) urgency = 'answered';
    else if (q.dismissed_at) urgency = 'dismissed';
    else {
      const age = now - new Date(q.created_at).getTime();
      urgency = age > 24 * 60 * 60 * 1000 ? 'urgent' : 'pending';
    }
    return { ...q, urgency };
  });

  // Sort: urgent first, then pending, then answered/dismissed
  const order = { urgent: 0, pending: 1, answered: 2, dismissed: 3 };
  tagged.sort((a, b) => order[a.urgency] - order[b.urgency]);

  res.json({ questions: tagged });
});

// Tutor/Admin: mark a question as read/resolved without writing a real
// answer — e.g. a student's follow-up "thank u" that doesn't need a reply.
export const dismissQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('questions')
    .update({
      dismissed_by: req.user.id,
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, student:student_id(full_name, email), answerer:answered_by(full_name)')
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Not allowed');
  res.json({ question: data });
});

// Tutor/Admin: answer a question
export const answerQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;
  if (!answer?.trim()) throw new ApiError(400, 'answer is required');

  const { data, error } = await req.supabase
    .from('questions')
    .update({
      answer,
      answered_by: req.user.id,
      answered_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, student:student_id(full_name, email), answerer:answered_by(full_name)')
    .single();

  if (error || !data) throw new ApiError(403, error?.message || 'Not allowed');

  // Notify the student that their question was answered
  const admin = getAdminClient();
  await admin.from('notifications').insert({
    user_id:     data.student_id,
    type:        'question_answered',
    question_id: data.id,
    lesson_id:   data.lesson_id,
    message:     `Your question was answered: "${data.question?.slice(0, 80)}"`,
  });

  res.json({ question: data });
});
