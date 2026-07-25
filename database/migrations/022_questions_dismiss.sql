-- =========================================================
-- questions.dismissed_at / dismissed_by : "mark as read" for questions that
-- don't need a real answer (e.g. a student's follow-up "thank u"). Mirrors
-- the existing answered_at/answered_by pattern, kept as a separate state
-- from answered so a tutor can tell "I replied" apart from "no reply needed".
-- No new RLS policy needed — tutors_answer_questions (012_rls_policies.sql /
-- 014_questions.sql) already allows UPDATE on any column for a question the
-- tutor is assigned to.
-- =========================================================
alter table public.questions
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissed_by uuid references public.profiles(id);
