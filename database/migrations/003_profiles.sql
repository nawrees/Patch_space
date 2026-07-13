-- =========================================================
-- profiles: 1-to-1 extension of auth.users, carries the app role
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'student',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
--
-- SECURITY NOTE: role is ALWAYS forced to 'student' here, regardless of
-- whatever a client sends in signup metadata. Tutor/admin accounts must be
-- promoted afterwards by an existing admin (a service-role call from the
-- backend), never self-claimed at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Block role self-escalation: only an existing admin may change someone's role.
create or replace function public.protect_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_role public.user_role;
begin
  if new.role is distinct from old.role then
    select role into acting_user_role from public.profiles where id = auth.uid();
    if acting_user_role is distinct from 'admin' then
      new.role = old.role;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute procedure public.protect_role_update();
