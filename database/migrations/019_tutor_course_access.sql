-- =========================================================
-- Grant tutors real (RLS-level) access to a course's content once an
-- admin has explicitly assigned them to mentor a student in that course
-- (tutor_assignments.course_id) — even if the tutor didn't create the
-- course and it isn't published. Mirrors the same pattern already used
-- for the `questions` table (014_questions.sql, tutors_read_assigned_questions).
--
-- A null course_id on an assignment row means "all of this student's
-- courses", which — consistent with the existing questions policy —
-- is treated as unrestricted course access for that tutor.
--
-- Read-only: the matching *_write policies are untouched, so this grants
-- mentoring visibility, not edit rights.
-- =========================================================

create or replace function public.is_tutor_of_course(target_course uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tutor_assignments
    where tutor_id = auth.uid() and (course_id = target_course or course_id is null)
  );
$$;

-- ---------- courses ----------
drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses
  for select using (
    is_published = true
    or created_by = auth.uid()
    or public.is_admin()
    or public.is_tutor_of_course(id)
  );

-- ---------- modules ----------
drop policy if exists "modules_select" on public.modules;
create policy "modules_select" on public.modules
  for select using (
    public.is_admin()
    or public.is_tutor_of_course(modules.course_id)
    or exists (
      select 1 from public.courses c
      where c.id = modules.course_id
        and (c.is_published = true or c.created_by = auth.uid())
    )
  );

-- ---------- lessons ----------
drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select" on public.lessons
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(lessons.id))
    or public.is_tutor_of_course(public.course_of_lesson(lessons.id))
  );

-- ---------- lesson_resources ----------
drop policy if exists "lesson_resources_select" on public.lesson_resources;
create policy "lesson_resources_select" on public.lesson_resources
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_resources.lesson_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(lesson_resources.lesson_id))
    or public.is_tutor_of_course(public.course_of_lesson(lesson_resources.lesson_id))
  );

-- ---------- labs ----------
drop policy if exists "labs_select" on public.labs;
create policy "labs_select" on public.labs
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      join public.lessons l on l.module_id = m.id
      where l.id = labs.lesson_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(labs.lesson_id))
    or public.is_tutor_of_course(public.course_of_lesson(labs.lesson_id))
  );
