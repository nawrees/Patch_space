create table public.user_streaks (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_activity_date date,
  updated_at       timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "streaks_own" on public.user_streaks
  for all using (user_id = auth.uid());
