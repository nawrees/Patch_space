-- Add video timestamp tracking to progress so "Continue Learning" can
-- resume a video at the exact second the student left off.
alter table public.progress
  add column if not exists video_timestamp_seconds integer not null default 0;
