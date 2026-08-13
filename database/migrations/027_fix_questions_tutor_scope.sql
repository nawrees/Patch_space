-- =========================================================
-- Fix over-broad Q&A visibility — TWO separate bugs found here, the second
-- one caught only by live-testing with a real tutor account rather than
-- just reading the policy:
--
-- 1. is_tutor_of(student_id) (011_rls_functions.sql) checks ONLY
--    tutor_id + student_id, ignoring course_id entirely. The questions
--    table's original policies (014_questions.sql) used it alongside an
--    already course-scoped check, which made that course-scoping
--    meaningless — a tutor assigned to mentor a student for ONE course
--    could see that student's questions on every OTHER course too.
--
-- 2. The course-scoped check itself never joined on student_id at all —
--    "tutor_id = auth.uid() and course_id matches" without also requiring
--    "and this is actually MY assigned student" — so a tutor assigned to
--    mentor even ONE student in a course could read *every other enrolled
--    student's* questions in that same course. This bug predates this
--    session; it was just never noticed because bug #1 always masked it
--    (the over-broad is_tutor_of() branch was usually the one granting
--    access, so this second gap never got exercised on its own).
--
-- Fix: require ALL THREE of tutor_id, student_id, AND (course_id match or
-- null/unrestricted) in the same exists() — a tutor sees a question only
-- when they are actually assigned to mentor THAT student for THAT course
-- (or unrestricted for that student).
--
-- Fix (update): a question that already has an answer should only be
-- editable by whoever wrote that answer (or an admin) — any other assigned
-- tutor can still see it and can still answer/dismiss it *while it's
-- unanswered*, but shouldn't be able to overwrite a colleague's answer.
-- =========================================================

drop policy "tutors_read_assigned_questions" on public.questions;
create policy "tutors_read_assigned_questions" on public.questions
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.tutor_assignments ta
      where ta.tutor_id = auth.uid()
        and ta.student_id = questions.student_id
        and (ta.course_id = questions.course_id or ta.course_id is null)
    )
  );

drop policy "tutors_answer_questions" on public.questions;
create policy "tutors_answer_questions" on public.questions
  for update using (
    public.is_admin()
    or answered_by = auth.uid()
    or (
      answered_by is null
      and exists (
        select 1 from public.tutor_assignments ta
        where ta.tutor_id = auth.uid()
          and ta.student_id = questions.student_id
          and (ta.course_id = questions.course_id or ta.course_id is null)
      )
    )
  );
