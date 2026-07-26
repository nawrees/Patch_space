-- =========================================================
-- Fix over-broad Q&A visibility: is_tutor_of(student_id) (011_rls_functions.sql)
-- checks ONLY tutor_id + student_id, ignoring course_id entirely. The
-- questions table's RLS policies (014_questions.sql) used it alongside an
-- already-correct, course-scoped check — so a tutor assigned to mentor a
-- student for ONE course could see (and even answer/dismiss) that
-- student's questions on every OTHER course too, since the redundant
-- is_tutor_of() branch made the course-scoped check meaningless.
--
-- Fix (select): drop the redundant is_tutor_of() branch, keep only the
-- course-scoped check (which already treats a null course_id assignment as
-- "mentors this student on every course", so nothing legitimate is lost).
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
          and (ta.course_id = questions.course_id or ta.course_id is null)
      )
    )
  );
