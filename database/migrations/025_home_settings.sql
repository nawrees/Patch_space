-- =========================================================
-- site_settings : extend with admin-editable Home page content.
-- The public Home page's hero/features/CTA copy was fully hardcoded in
-- home.component.ts/html — unlike About Us and Contact, an admin had no way
-- to change it. Mirrors the existing about_* columns/pattern exactly.
-- Defaults match the current hardcoded copy so nothing visibly changes
-- until an admin actually edits it.
-- =========================================================
alter table public.site_settings
  add column if not exists home_hero_eyebrow text not null default 'Cybersecurity training',
  add column if not exists home_hero_title text not null default 'Learn to break things — safely.',
  add column if not exists home_hero_subtitle text not null default 'Hands-on courses and real Docker-backed labs for people who''d rather exploit a vulnerability than just read about one.',
  add column if not exists home_features jsonb not null default '[
    {"icon":"box","title":"Hands-on Docker labs","body":"Every lab boots a real, isolated container just for you — exploit it, break it, capture the flag. Nothing simulated."},
    {"icon":"book-open","title":"Structured courses","body":"Lessons build on each other with tracked progress, so you always know what to tackle next."},
    {"icon":"flame","title":"Streaks & badges","body":"Daily streaks and earned badges turn steady practice into visible progress."},
    {"icon":"message-circle","title":"Tutor support","body":"Stuck on a lab? Ask a real tutor and get an answer, not a canned hint."}
  ]'::jsonb,
  add column if not exists home_cta_title text not null default 'Ready to start your first lab?',
  add column if not exists home_cta_body text not null default 'Create a free account — no credit card, just a terminal.';
