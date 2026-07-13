create table public.saved_courses (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (student_id, course_id)
);

alter table public.saved_courses enable row level security;

create policy "saved_courses_own" on public.saved_courses
  for all using (student_id = auth.uid());
