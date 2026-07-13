-- =========================================================
-- lab_sessions    : one Docker container lifecycle per student attempt
-- lab_submissions : flag/answer submissions for a lab attempt
--
-- SECURITY NOTE: rows in these two tables are written ONLY by the backend,
-- using the Supabase service-role key (which bypasses RLS). Regular
-- authenticated clients only ever SELECT their own rows below. This keeps
-- container lifecycle and flag verification fully server-controlled, so a
-- student can't spoof session status or submission results from the client.
-- =========================================================
create table public.lab_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  container_id text,
  container_name text,
  status public.lab_session_status not null default 'provisioning',
  access_url text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  stopped_at timestamptz,
  last_activity_at timestamptz not null default now()
);

create index idx_lab_sessions_student on public.lab_sessions(student_id);
create index idx_lab_sessions_lab on public.lab_sessions(lab_id);
create index idx_lab_sessions_status on public.lab_sessions(status);

create table public.lab_submissions (
  id uuid primary key default gen_random_uuid(),
  lab_session_id uuid not null references public.lab_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  submitted_flag text not null,
  is_correct boolean not null,
  attempt_number int not null,
  submitted_at timestamptz not null default now()
);

create index idx_lab_submissions_student on public.lab_submissions(student_id);
create index idx_lab_submissions_session on public.lab_submissions(lab_session_id);
