-- =========================================================
-- Let a tutor read (not write) full course content — modules, lessons,
-- lesson resources, and lab details — for any course where they're
-- assigned (via tutor_assignments) to a student who is actually enrolled
-- in that course. Previously courses_select/modules_select/lessons_select/
-- lesson_resources_select/labs_select only granted non-owner read access
-- via `is_published = true`, so a tutor mentoring a student in another
-- tutor's DRAFT course — or wanting lesson/lab detail for a published one
-- from the staff catalog — had no reliable way to see it. This mirrors the
-- same "specific course_id, or course_id is null = unrestricted" rule
-- already used by getStudentOverview/listMyStudents in tutors.controller.js.
-- =========================================================

create or replace function public.is_assigned_tutor_of_course(target_course uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.tutor_assignments ta
    join public.enrollments e
      on e.student_id = ta.student_id and e.course_id = target_course
    where ta.tutor_id = auth.uid()
      and (ta.course_id = target_course or ta.course_id is null)
  );
$$;

drop policy "courses_select" on public.courses;
create policy "courses_select" on public.courses
  for select using (
    is_published = true
    or created_by = auth.uid()
    or public.is_admin()
    or public.is_assigned_tutor_of_course(id)
  );

drop policy "modules_select" on public.modules;
create policy "modules_select" on public.modules
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = modules.course_id
        and (c.is_published = true or c.created_by = auth.uid())
    )
    or public.is_assigned_tutor_of_course(modules.course_id)
  );

drop policy "lessons_select" on public.lessons;
create policy "lessons_select" on public.lessons
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(lessons.id))
    or public.is_assigned_tutor_of_course(public.course_of_lesson(lessons.id))
  );

drop policy "lesson_resources_select" on public.lesson_resources;
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
    or public.is_assigned_tutor_of_course(public.course_of_lesson(lesson_resources.lesson_id))
  );

drop policy "labs_select" on public.labs;
create policy "labs_select" on public.labs
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      join public.lessons l on l.module_id = m.id
      where l.id = labs.lesson_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(labs.lesson_id))
    or public.is_assigned_tutor_of_course(public.course_of_lesson(labs.lesson_id))
  );
