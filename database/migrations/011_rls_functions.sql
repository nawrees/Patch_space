-- =========================================================
-- Helper functions used inside RLS policies.
-- All are SECURITY DEFINER with a fixed search_path so they can read
-- public.profiles / public.tutor_assignments / public.enrollments
-- regardless of the calling user's own row-level permissions, without
-- becoming a search-path hijack risk.
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_app_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_tutor_of(target_student uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tutor_assignments
    where tutor_id = auth.uid() and student_id = target_student
  );
$$;

create or replace function public.is_enrolled(target_course uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where student_id = auth.uid()
      and course_id = target_course
      and status <> 'dropped'
  );
$$;

-- Resolve a lesson_id up to its course_id, used by lesson/lab/resource RLS.
create or replace function public.course_of_lesson(target_lesson uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select m.course_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = target_lesson;
$$;
