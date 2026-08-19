-- =========================================================
-- profiles.phone / profiles.address : captured at signup (frontend sends
-- them as auth signup metadata, same mechanism full_name already uses).
-- handle_new_user() is updated to also populate them from that metadata.
-- Nothing sensitive/privileged here (unlike role, which the trigger
-- deliberately still hardcodes to 'student' regardless of client input).
--
-- Phone is REQUIRED at signup — enforced here in the trigger, not just in
-- the frontend form, since the frontend can be bypassed entirely (dev
-- tools, calling supabase.auth.signUp() directly). Raising an exception
-- here aborts the whole transaction, so no auth.users row gets created
-- either — the signup is genuinely rejected, not just missing a field
-- afterward. The column itself stays nullable (not a table-level NOT NULL)
-- so this doesn't retroactively break existing accounts that predate this
-- requirement and have no phone on file.
-- =========================================================

alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if btrim(coalesce(new.raw_user_meta_data->>'phone', '')) = '' then
    raise exception 'A phone number is required to sign up.';
  end if;

  insert into public.profiles (id, email, full_name, phone, address, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    'student'
  );
  return new;
end;
$$;
