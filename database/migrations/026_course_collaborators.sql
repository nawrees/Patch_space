-- =========================================================
-- course_collaborators : lets a course's owner grant another tutor edit
-- access to their course (modules/lessons/labs/lesson_resources, and the
-- course's own metadata), and revoke it again whenever they want. This is
-- separate from tutor_assignments (which is about mentoring a STUDENT,
-- read-only) — this grants a second TUTOR real write access to a course
-- they didn't author.
-- =========================================================
create table public.course_collaborators (
  course_id uuid not null references public.courses(id) on delete cascade,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key (course_id, tutor_id)
);

create index idx_course_collaborators_tutor on public.course_collaborators(tutor_id);

alter table public.course_collaborators enable row level security;

create or replace function public.is_course_collaborator(target_course uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.course_collaborators
    where course_id = target_course and tutor_id = auth.uid()
  );
$$;

-- A collaborator can see their own grant; the owner/admin can see all
-- grants for their course (this naturally means a non-owner collaborator
-- querying "all collaborators of this course" only gets their own row back
-- — nothing else to restrict at the application layer).
create policy "course_collaborators_select" on public.course_collaborators
  for select using (
    public.is_admin()
    or tutor_id = auth.uid()
    or exists (
      select 1 from public.courses c
      where c.id = course_collaborators.course_id and c.created_by = auth.uid()
    )
  );

-- Only the course owner (or admin) can grant access.
create policy "course_collaborators_insert" on public.course_collaborators
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_collaborators.course_id and c.created_by = auth.uid()
    )
  );

-- Only the course owner (or admin) can revoke access.
create policy "course_collaborators_delete" on public.course_collaborators
  for delete using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_collaborators.course_id and c.created_by = auth.uid()
    )
  );

-- Extend the write policies a granted collaborator needs to actually edit
-- the course. Delete policies are intentionally left untouched — a
-- collaborator can edit content but not delete the course itself.
drop policy "courses_update" on public.courses;
create policy "courses_update" on public.courses
  for update using (
    created_by = auth.uid()
    or public.is_admin()
    or public.is_course_collaborator(id)
  );

drop policy "modules_write" on public.modules;
create policy "modules_write" on public.modules
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = modules.course_id and c.created_by = auth.uid()
    )
    or public.is_course_collaborator(modules.course_id)
  );

drop policy "lessons_write" on public.lessons;
create policy "lessons_write" on public.lessons
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.created_by = auth.uid()
    )
    or public.is_course_collaborator(public.course_of_lesson(lessons.id))
  );

drop policy "lesson_resources_write" on public.lesson_resources;
create policy "lesson_resources_write" on public.lesson_resources
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_resources.lesson_id and c.created_by = auth.uid()
    )
    or public.is_course_collaborator(public.course_of_lesson(lesson_resources.lesson_id))
  );

drop policy "labs_write" on public.labs;
create policy "labs_write" on public.labs
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      join public.lessons l on l.module_id = m.id
      where l.id = labs.lesson_id and c.created_by = auth.uid()
    )
    or public.is_course_collaborator(public.course_of_lesson(labs.lesson_id))
  );
