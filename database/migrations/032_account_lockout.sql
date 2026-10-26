-- =========================================================
-- Real, server-side login lockout.
--
-- Replaces the login component's client-side failedAttempts/isLocked
-- state, which was UI-only friction: it lived in browser memory, so a
-- page refresh or a direct call to Supabase Auth (bypassing the Angular
-- app entirely) ignored it completely. The lock state now lives here, in
-- Postgres, and is authoritative regardless of which client calls it.
--
-- Threshold (3 attempts) and lock duration (15 minutes) are intentionally
-- hardcoded in record_failed_login() rather than passed in as parameters
-- from the frontend — a lockout policy shouldn't be something the caller
-- gets to decide. The frontend's job is just to call check_login_locked()
-- before attempting sign-in, call record_failed_login() after a failed
-- one, and call clear_login_attempts() after a successful one.
-- =========================================================

create table public.login_lockouts (
  email text primary key,
  failed_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- No client-facing policies at all: every access to this table goes
-- through the SECURITY DEFINER functions below, never a direct
-- select/insert/update from req.supabase or the anon client. Same
-- pattern already used for lab_sessions/lab_submissions/audit_logs.
alter table public.login_lockouts enable row level security;

-- ---------------------------------------------------------------
-- check_login_locked(email): returns the lock expiry if the account is
-- currently locked, or null if it isn't (never locked, or the lock has
-- already expired). The frontend calls this BEFORE attempting sign-in.
-- ---------------------------------------------------------------
create or replace function public.check_login_locked(p_email text)
returns timestamptz
language sql
security definer
stable
set search_path = public
as $$
  select locked_until
  from public.login_lockouts
  where email = lower(trim(p_email))
    and locked_until is not null
    and locked_until > now();
$$;

-- ---------------------------------------------------------------
-- record_failed_login(email): increments the failure count for this
-- email and locks it for 15 minutes once the count reaches 3. Returns
-- both the running failed_count (so the UI can show "N attempts left")
-- and the resulting locked_until (null if not yet locked, so the UI can
-- show real remaining time once it is) as a single jsonb value.
-- ---------------------------------------------------------------
create or replace function public.record_failed_login(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_count int;
  v_locked_until timestamptz;
begin
  insert into public.login_lockouts (email, failed_count, updated_at)
  values (v_email, 1, now())
  on conflict (email) do update
    set failed_count = case
          -- A previous lock that has already expired starts a fresh count
          -- of 1 instead of continuing to climb from wherever it left off.
          when public.login_lockouts.locked_until is not null
           and public.login_lockouts.locked_until <= now()
          then 1
          else public.login_lockouts.failed_count + 1
        end,
        updated_at = now()
  returning failed_count into v_count;

  if v_count >= 3 then
    v_locked_until := now() + interval '15 minutes';
    update public.login_lockouts
      set locked_until = v_locked_until
      where email = v_email;
  end if;

  return jsonb_build_object('failed_count', v_count, 'locked_until', v_locked_until);
end;
$$;

-- ---------------------------------------------------------------
-- clear_login_attempts(email): called after a successful sign-in.
-- ---------------------------------------------------------------
create or replace function public.clear_login_attempts(p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.login_lockouts
    set failed_count = 0, locked_until = null, updated_at = now()
    where email = lower(trim(p_email));
$$;

-- Callable pre-authentication (anon) as well as authenticated — these
-- fire around the login boundary itself, before any session exists.
grant execute on function public.check_login_locked(text) to anon, authenticated;
grant execute on function public.record_failed_login(text) to anon, authenticated;
grant execute on function public.clear_login_attempts(text) to anon, authenticated;
