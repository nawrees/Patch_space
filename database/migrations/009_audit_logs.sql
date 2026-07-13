-- =========================================================
-- audit_logs : lightweight security/activity trail.
-- This is a stop-gap until Wazuh is wired into the labs later; admins can
-- already review logins, lab starts/stops and flag submissions from here.
-- =========================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,           -- e.g. 'login', 'lab_start', 'lab_stop', 'flag_submit'
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_user on public.audit_logs(user_id);
create index idx_audit_logs_event on public.audit_logs(event_type);
create index idx_audit_logs_created on public.audit_logs(created_at desc);
