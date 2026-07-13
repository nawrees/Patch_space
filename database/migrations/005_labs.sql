-- =========================================================
-- labs : Docker-backed hands-on exercises, attached to a lesson
-- =========================================================
create table public.labs (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid unique references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  docker_image text not null,
  docker_compose jsonb,              -- optional: multi-container lab spec
  cpu_limit numeric not null default 1.0,
  memory_limit_mb int not null default 512,
  max_duration_minutes int not null default 60,
  flag_hash text,                    -- sha256 hex digest of the expected flag
  created_at timestamptz not null default now()
);

create index idx_labs_lesson on public.labs(lesson_id);
