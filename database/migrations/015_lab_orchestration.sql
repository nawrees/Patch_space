-- service_port: which container port to expose for student access (default 80 for web-based labs)
alter table public.labs
  add column if not exists service_port integer not null default 80;

-- session_flag_hash: per-session random flag hash (prevents flag sharing between students).
-- When this is set, flag verification uses this hash instead of labs.flag_hash.
alter table public.lab_sessions
  add column if not exists session_flag_hash text;
