create table public.lab_ratings (
  id          uuid primary key default gen_random_uuid(),
  lab_id      uuid not null references public.labs(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (lab_id, student_id)
);

alter table public.lab_ratings enable row level security;

-- Anyone authenticated can read ratings (needed for avg display)
create policy "lab_ratings_select" on public.lab_ratings
  for select using (auth.uid() is not null);

-- Students manage only their own rating
create policy "lab_ratings_write" on public.lab_ratings
  for all using (student_id = auth.uid());
