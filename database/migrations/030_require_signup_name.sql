-- =========================================================
-- Require BOTH a first and a last name at signup, individually — not just
-- a non-empty combined string. The frontend now sends first_name/last_name
-- as separate signup metadata fields (previously it pre-joined them into
-- one full_name before this trigger ever saw it, which meant "John" with
-- no last name at all still passed a non-empty check). This trigger builds
-- full_name itself from the two parts, so profiles.full_name stays the
-- single field the rest of the app already expects.
--
-- Same enforcement pattern as phone (029_profile_phone_address.sql):
-- raising an exception here aborts the whole signup transaction — no
-- auth.users row gets created either, not just an incomplete profile.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_name text := btrim(coalesce(new.raw_user_meta_data->>'first_name', ''));
  last_name  text := btrim(coalesce(new.raw_user_meta_data->>'last_name', ''));
begin
  if first_name = '' or last_name = '' then
    raise exception 'Your first and last name are both required to sign up.';
  end if;

  if btrim(coalesce(new.raw_user_meta_data->>'phone', '')) = '' then
    raise exception 'A phone number is required to sign up.';
  end if;

  insert into public.profiles (id, email, full_name, phone, address, role)
  values (
    new.id,
    new.email,
    first_name || ' ' || last_name,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    'student'
  );
  return new;
end;
$$;
