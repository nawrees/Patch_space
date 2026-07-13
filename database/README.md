# Database — Cybersecurity E-Learning Platform

Supabase (Postgres) schema for the platform: students, tutors, admins, courses,
lessons, PDF resources, and Docker-backed labs.

## Applying the migrations

Run the files in `migrations/` **in numeric order**, either:

- Pasted one-by-one into the Supabase Dashboard → SQL Editor, or
- Via the Supabase CLI:
  ```bash
  supabase link --project-ref <your-project-ref>
  supabase db push
  ```
  (copy/rename the files into `supabase/migrations/<timestamp>_<name>.sql` if you're
  using the CLI's migration folder convention)

Then, optionally, run `seed.sql` for sample course/lesson/lab data.

## Schema overview

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`, carries `role` (student/tutor/admin) |
| `courses` → `modules` → `lessons` | Content hierarchy |
| `lesson_resources` | PDFs/slides attached to a lesson (see below) |
| `labs` | Docker lab config attached 1:1 to a lesson |
| `enrollments` | student ↔ course |
| `tutor_assignments` | tutor ↔ student (optionally scoped to one course) |
| `progress` | per-student, per-lesson completion/score/time |
| `lab_sessions` | one row per running/finished lab container attempt |
| `lab_submissions` | flag/answer submissions for a lab attempt |
| `audit_logs` | login/lab-start/lab-stop/flag-submit trail (stop-gap until Wazuh) |

## Security model

Two layers, deliberately split by sensitivity:

1. **Direct client access (RLS-scoped)** — students/tutors/admins query Supabase
   directly with the anon/authenticated key for low-risk reads: courses, lessons,
   their own progress, their own enrollments, etc. Row Level Security policies
   (`011_rls_functions.sql`, `012_rls_policies.sql`) enforce:
   - Students only see published courses they're enrolled in (full lesson content
     requires enrollment; catalog browsing of titles is open).
   - Tutors only see students they're assigned to (`tutor_assignments`).
   - Admins see everything.
   - Nobody can self-promote their own `role` (`trg_protect_profile_role`).

2. **Backend-mediated access (service-role key)** — anything where the *server*
   must be the source of truth is written **only** by the Node.js backend using
   the Supabase **service role key** (which bypasses RLS entirely). Clients can
   `SELECT` their own rows, but there are no client-facing `INSERT`/`UPDATE`
   policies for:
   - `lab_sessions` / `lab_submissions` — so a student can't fake "lab completed"
     or spoof a correct flag from the browser; the backend starts/stops the
     Docker container and verifies the flag server-side.
   - `audit_logs` — written only by the backend.

## PDF / resource viewing (`lesson_resources`)

Files live in a **private** Supabase Storage bucket, e.g. `lesson-resources`.
The `lesson_resources` table only stores *metadata* + the storage path — never a
public URL — and RLS on that table only exposes metadata to people who could
already see the parent lesson (enrolled student / course creator / admin).

**Storage bucket setup (one-time, in Supabase Dashboard → Storage):**
1. Create a bucket named `lesson-resources`, set to **private**.
2. Leave it with no additional client-facing policies — RLS on `storage.objects`
   denies all access to `anon`/`authenticated` by default, so only the backend's
   **service role key** can read/write files in it.

**Suggested object path convention:** `<course_id>/<lesson_id>/<filename>`

**Viewing flow (implemented in the backend, next step):**
1. Frontend requests `GET /api/lessons/:lessonId/resources/:resourceId/url`.
2. Backend checks the caller is enrolled in that lesson's course (or is the
   course's tutor/admin).
3. Backend calls Supabase Storage `createSignedUrl(storage_path, 60)` with the
   service role key and returns `{ url }`.
4. Angular opens that signed URL in a PDF viewer (e.g. `<iframe [src]="url">`
   or `ngx-extended-pdf-viewer`) — the link expires after 60 seconds, so it
   can't be shared/reused later.

## Bootstrapping the first admin

New signups always land as `role = 'student'` (enforced by `handle_new_user`).
To create your first admin, sign up normally through Supabase Auth, then run
once in the SQL Editor (as the project owner, which bypasses RLS):

```sql
update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
```

From then on, that admin account should promote tutors via the backend's
admin API (using the service role key), not directly through the client.

## Environment variables the backend will need

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=...        # used by anything mimicking client-side calls
SUPABASE_SERVICE_ROLE_KEY=... # backend only — NEVER ship this to the frontend
```
