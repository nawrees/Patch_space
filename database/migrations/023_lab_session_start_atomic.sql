-- =========================================================
-- start_lab_session() : atomic check-and-insert for lab session starts.
-- Previously the backend did three separate SELECTs (existing session,
-- per-student count, platform-wide count) followed by a separate INSERT —
-- concurrent requests could all read the same counts before any of them had
-- inserted a row, letting a student (or many students at once) exceed both
-- LAB_MAX_CONCURRENT_PER_STUDENT and LAB_MAX_CONCURRENT_TOTAL. An advisory
-- lock held for the duration of this function serializes all lab-session
-- starts platform-wide, closing the race — the critical section is tiny
-- (a couple of counts + one insert), so this isn't a meaningful bottleneck.
-- =========================================================
create or replace function public.start_lab_session(
  p_student_id uuid,
  p_lab_id uuid,
  p_container_name text,
  p_session_flag_hash text,
  p_expires_at timestamptz,
  p_max_per_student int,
  p_max_total int
) returns public.lab_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_student_count int;
  v_total_count int;
  v_session public.lab_sessions;
begin
  perform pg_advisory_xact_lock(hashtext('lab_sessions_start'));

  select id into v_existing
    from public.lab_sessions
    where lab_id = p_lab_id and student_id = p_student_id
      and status in ('provisioning', 'running')
    limit 1;

  if v_existing is not null then
    raise exception 'ACTIVE_SESSION_EXISTS';
  end if;

  select count(*) into v_student_count
    from public.lab_sessions
    where student_id = p_student_id and status in ('provisioning', 'running');

  if v_student_count >= p_max_per_student then
    raise exception 'STUDENT_CAP_REACHED';
  end if;

  select count(*) into v_total_count
    from public.lab_sessions
    where status in ('provisioning', 'running');

  if v_total_count >= p_max_total then
    raise exception 'PLATFORM_CAP_REACHED';
  end if;

  insert into public.lab_sessions (
    student_id, lab_id, container_name, status, session_flag_hash, expires_at
  ) values (
    p_student_id, p_lab_id, p_container_name, 'provisioning', p_session_flag_hash, p_expires_at
  )
  returning * into v_session;

  return v_session;
end;
$$;

-- Callable by any authenticated user via req.supabase — the function itself
-- enforces the caps regardless of caller, and lab_sessions_select RLS still
-- governs who can read the row back afterwards.
grant execute on function public.start_lab_session(uuid, uuid, text, text, timestamptz, int, int) to authenticated;
