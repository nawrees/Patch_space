-- =========================================================
-- Validate phone FORMAT at signup, not just presence — Tunisian numbers
-- are 8 digits, optionally prefixed with +216 (no per-city variable
-- length to account for). Same rule enforced in three places, kept in
-- sync: frontend/src/app/core/utils/phone.ts, auth.controller.js's
-- updateProfile, and here. Raising an exception here aborts the whole
-- signup transaction, same as the existing presence checks.
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
  phone_raw    text := btrim(coalesce(new.raw_user_meta_data->>'phone', ''));
  phone_digits text := regexp_replace(phone_raw, '[^0-9]', '', 'g');
  phone_local  text := case
    when left(phone_digits, 3) = '216' and length(phone_digits) = 11 then substring(phone_digits from 4)
    else phone_digits
  end;
begin
  if first_name = '' or last_name = '' then
    raise exception 'Your first and last name are both required to sign up.';
  end if;

  if phone_raw = '' then
    raise exception 'A phone number is required to sign up.';
  end if;

  -- Reject stray characters (letters, symbols) up front — otherwise
  -- something like "21025126hh" would have its letters silently stripped
  -- by regexp_replace above and pass as a clean 8-digit number.
  if phone_raw !~ '^\+?[0-9\s-]+$' then
    raise exception 'Enter a valid Tunisian phone number (8 digits, optionally with +216).';
  end if;

  if length(phone_local) <> 8 then
    raise exception 'Enter a valid Tunisian phone number (8 digits, optionally with +216).';
  end if;

  insert into public.profiles (id, email, full_name, phone, address, role)
  values (
    new.id,
    new.email,
    first_name || ' ' || last_name,
    phone_raw,
    new.raw_user_meta_data->>'address',
    'student'
  );
  return new;
end;
$$;
