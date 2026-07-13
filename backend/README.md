# Backend — Cybersecurity E-Learning Platform

Node.js + Express API in front of the Supabase database from `../database`.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your Supabase project's URL + keys
npm run dev             # nodemon, http://localhost:4000
```

## How auth actually works here

This backend does **not** handle sign-up/sign-in/passwords. The Angular app
talks to Supabase Auth directly via `supabase-js` (sign up, sign in, refresh
tokens, the works — that's what Supabase Auth is built for). Once Angular has
a session, it sends the user's **access token** to this API as a normal
Bearer token:

```
Authorization: Bearer <supabase-access-token>
```

`authenticate` middleware (`src/middleware/authenticate.js`) verifies that
token against Supabase, loads the matching `profiles` row, and attaches:

- `req.supabase` — a Supabase client scoped to that user (their token is
  forwarded on every query it makes)
- `req.user` — `{ id, email }` from Supabase Auth
- `req.profile` — `{ id, email, full_name, role }` from `public.profiles`

## Why most controllers barely have any authorization logic

Almost every controller just does `req.supabase.from(table)...` and lets
**Postgres Row Level Security** (defined in `../database/migrations`) decide
what comes back. E.g. `getCourse` runs the exact same query for a student, a
tutor, and an admin — RLS returns different rows (or no row) depending on who's
asking. This means:

- Less duplicated logic between the database and the API layer.
- A bug in a controller can't accidentally leak data RLS wouldn't allow anyway.
- `requireRole(...)` in routes is a courtesy / early-exit for nicer error
  messages, not the actual security boundary.

The **service-role key** (`getAdminClient()`) only shows up in one place right
now: Supabase Storage signed URLs and uploads for `lesson_resources`, because
that bucket intentionally has no client-facing storage policies (see
`../database/README.md`). Every other write goes through the caller's own
RLS-scoped client.

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/api/auth/me` | any authenticated | current user + profile |
| GET | `/api/courses` | any | list visible courses |
| GET | `/api/courses/:id` | any | course + modules + lessons + labs + resources |
| POST/PUT/DELETE | `/api/courses[/:id]` | admin, tutor | manage courses |
| POST | `/api/courses/:courseId/modules` | admin, tutor | add module |
| PUT/DELETE | `/api/modules/:id` | admin, tutor | edit/remove module |
| POST | `/api/modules/:moduleId/lessons` | admin, tutor | add lesson |
| GET | `/api/lessons/:id` | enrolled / owner / admin | lesson detail |
| PUT/DELETE | `/api/lessons/:id` | admin, tutor | edit/remove lesson |
| POST | `/api/lessons/:lessonId/lab` | admin, tutor | create/update lab metadata (hashes the flag) |
| DELETE | `/api/labs/:id` | admin, tutor | remove lab |
| GET | `/api/lessons/:lessonId/resources` | enrolled / owner / admin | list PDFs/attachments |
| POST | `/api/lessons/:lessonId/resources` | admin, tutor | upload a PDF (`multipart/form-data`, field `file`) |
| GET | `/api/resources/:resourceId/signed-url` | enrolled / owner / admin | 60s signed URL to view the file |
| DELETE | `/api/resources/:id` | admin, tutor | remove a resource |
| POST | `/api/courses/:courseId/enroll` | student | self-enroll |
| POST | `/api/enrollments` | admin, tutor | enroll someone else |
| GET | `/api/enrollments/me` | student | my enrollments |
| PUT | `/api/enrollments/:id` | owner / admin | update status |
| GET | `/api/progress/me` | student | my progress across all lessons |
| PUT | `/api/progress/lessons/:lessonId` | student | upsert progress for a lesson |
| GET | `/api/progress/students/:studentId` | assigned tutor / admin | a student's progress |
| GET | `/api/tutors/me/students` | tutor | my assigned students |
| GET | `/api/tutors/students/:studentId/overview` | assigned tutor / admin | enrollments + progress for one student |
| GET | `/api/admin/users` | admin | list all users |
| PUT | `/api/admin/users/:id/role` | admin | promote/demote a user |
| POST | `/api/admin/tutor-assignments` | admin | assign a tutor to a student |

## Viewing a lesson's PDF end-to-end

1. `GET /api/lessons/:id` → returns the lesson plus a `lesson_resources` array (metadata only).
2. `GET /api/resources/:resourceId/signed-url` → backend checks access via RLS, then mints a
   60-second Supabase Storage signed URL.
3. Angular opens that URL in a PDF viewer (`<iframe [src]="url">` or a library like
   `ngx-extended-pdf-viewer`). The link expires quickly, so it can't be bookmarked/shared.

## Not built yet (next steps)

- **Lab session orchestration** — starting/stopping the actual Docker container for a
  lab attempt (`lab_sessions` / `lab_submissions` tables already exist and are
  locked down for exactly this: backend-only writes via the service role key).
- **Audit logging** — writing to `audit_logs` on login/lab events (table exists, not wired up).
- Rate limiting, request validation (e.g. zod/celebrate), and structured logging would all be
  worth adding before this goes anywhere near production.
