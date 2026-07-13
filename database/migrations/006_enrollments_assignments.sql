-- =========================================================
-- enrollments       : student <-> course
-- tutor_assignments : tutor   <-> student (optionally scoped to a course)
-- =========================================================
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, course_id)
);

create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_course on public.enrollments(course_id);

create table public.tutor_assignments (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade, -- null = applies across all courses
  assigned_at timestamptz not null default now(),
  unique (tutor_id, student_id, course_id)
);

create index idx_tutor_assignments_tutor on public.tutor_assignments(tutor_id);
create index idx_tutor_assignments_student on public.tutor_assignments(student_id);
