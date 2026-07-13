-- =========================================================
-- courses / modules / lessons : course content hierarchy
-- =========================================================
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text,
  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  thumbnail_url text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_courses_published on public.courses(is_published);
create index idx_courses_created_by on public.courses(created_by);

create trigger trg_courses_updated_at
  before update on public.courses
  for each row execute procedure public.set_updated_at();

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_modules_course on public.modules(course_id, order_index);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  lesson_type public.lesson_type not null default 'theory',
  content text,
  video_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_lessons_module on public.lessons(module_id, order_index);
