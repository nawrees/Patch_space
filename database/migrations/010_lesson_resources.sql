-- =========================================================
-- lesson_resources : downloadable / viewable attachments for a lesson
-- (PDFs, slide decks, cheat sheets, ...), stored in Supabase Storage.
--
-- SECURITY NOTE: storage_path points into a PRIVATE Supabase Storage
-- bucket (see README -> "Storage bucket setup"). The bucket has RLS
-- enabled with NO client-facing policies, so only the backend's
-- service-role key can read/write objects in it. The frontend never
-- talks to Storage directly — it asks the backend for a resource, the
-- backend re-checks enrollment, then mints a short-lived signed URL
-- (e.g. createSignedUrl(path, 60)) and hands that back for the PDF
-- viewer to open. This table only ever exposes metadata via RLS below,
-- never the file bytes themselves.
-- =========================================================
create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  resource_type text not null default 'pdf'
    check (resource_type in ('pdf', 'slide', 'doc', 'video', 'link', 'other')),
  storage_path text not null,      -- path inside the private bucket, e.g. "<course_id>/<lesson_id>/owasp-top10.pdf"
  mime_type text not null default 'application/pdf',
  file_size_bytes bigint,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_lesson_resources_lesson on public.lesson_resources(lesson_id, order_index);
