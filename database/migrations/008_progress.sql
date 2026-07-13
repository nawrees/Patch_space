-- =========================================================
-- progress : per-student, per-lesson completion tracking
-- =========================================================
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status public.progress_status not null default 'not_started',
  score numeric,
  attempts int not null default 0,
  time_spent_seconds int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create index idx_progress_student on public.progress(student_id);
create index idx_progress_lesson on public.progress(lesson_id);

create trigger trg_progress_updated_at
  before update on public.progress
  for each row execute procedure public.set_updated_at();
