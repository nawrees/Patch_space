-- Notification system: tutors notified on new questions,
-- students notified when their question is answered.

create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null check (type in ('question_asked', 'question_answered')),
  question_id uuid        references public.questions(id) on delete cascade,
  lesson_id   uuid        references public.lessons(id) on delete set null,
  message     text        not null,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Index for fast per-user queries
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Users see only their own notifications
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

-- Users can mark their own notifications as read
create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

-- Insert is done exclusively via service-role key (backend) — no user insert policy needed.

-- Enable Supabase Realtime so the frontend receives instant push
alter publication supabase_realtime add table public.notifications;
