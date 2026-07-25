-- =========================================================
-- site_settings : admin-editable public site content
-- Singleton row (id is always 1) — one global settings record, not one
-- per user. Publicly readable (About/Contact pages are unauthenticated),
-- writable only by admins.
-- =========================================================
create table public.site_settings (
  id int primary key default 1,
  contact_email text not null default 'contact@patchspace.io',
  about_hero_title text not null default 'Practicing security should feel like doing security.',
  about_hero_subtitle text not null default 'Patch Space is built on one idea: you don''t learn to find and fix vulnerabilities by reading about them — you learn by getting your hands on a real, breakable system.',
  about_values jsonb not null default '[
    {"icon":"box","title":"Real over simulated","body":"Every lab is a real, isolated Docker container — not a video, not a quiz. You attack an actual running target."},
    {"icon":"graduation-cap","title":"Practice, not just theory","body":"Courses exist to get you into a lab faster, not to replace one. Reading about SQL injection isn''t the same as exploiting it."},
    {"icon":"users","title":"People, not just content","body":"Real tutors answer real questions. Streaks and badges track progress that''s actually yours."}
  ]'::jsonb,
  about_company_title text not null default 'Built by Data do it',
  about_company_body text not null default 'Patch Space is developed and operated by Data do it, a team focused on building practical, hands-on tools for learning technical skills — starting with cybersecurity. We built the platform we wished existed when we were learning: fewer slides, more shells.',
  about_cta_title text not null default 'Questions before you sign up?',
  about_cta_body text not null default 'We''re happy to talk through what Patch Space does and doesn''t cover.',
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id) values (1);

alter table public.site_settings enable row level security;

-- Anyone (including anonymous visitors) can read — About/Contact are public pages.
create policy site_settings_select on public.site_settings
  for select using (true);

-- Only admins can change it. RLS is the real enforcement; the backend also
-- gates the update route with requireRole('admin') for a clean error message.
create policy site_settings_update on public.site_settings
  for update using (public.is_admin());
