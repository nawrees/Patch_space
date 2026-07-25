# Patch Space — Cybersecurity E-Learning Platform

A hands-on cybersecurity training platform: students take courses, watch videos, and run real, isolated Docker labs to practice actual exploitation techniques. Tutors mentor assigned students and answer their questions. Admins manage users, courses, and public site content.

**Stack:** Angular 18 (frontend) + Node.js/Express, ESM (backend) + Supabase/Postgres with Row Level Security (database) + Docker/dockerode (lab orchestration)

## Quick Start

### 1. Database Setup (Supabase)

1. Create a new project at supabase.com.
2. Go to Project → Settings → API and copy:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`
3. Open the SQL Editor and run every file in `database/migrations/` **in order, 001 through the highest-numbered file** (25 as of this writing). There is no Supabase CLI/automated migration runner wired up in this repo — each file must be pasted into the SQL Editor and run manually, in order. Skipping one silently breaks whichever feature depends on it (you'll see errors like `column ... does not exist` or `function ... does not exist`).
4. (Optional) Run `database/seed.sql` for sample data.
5. Create a Storage bucket for lesson PDFs:
   - Storage → New bucket → name it `lesson-resources` → mark **private** → create.
   - Leave it with no client-facing policies — the backend's service-role client is the only thing that reads/writes it, gated by its own RLS/ownership checks first.
   - The `course-thumbnails` bucket does **not** need manual setup — the backend creates it automatically (as public) the first time a course thumbnail is uploaded.

### 2. Backend Setup (Node.js)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials (from step 1)
npm run dev
# Should print: "API listening on http://localhost:4000"
```

Key `.env` variables (see `backend/.env.example` for the full list with comments):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Required — backend refuses to start without these |
| `CORS_ORIGIN` | Must match the Angular dev server origin |
| `LESSON_RESOURCES_BUCKET` / `COURSE_THUMBNAILS_BUCKET` | Storage bucket names |
| `LAB_MAX_CONCURRENT_PER_STUDENT` / `LAB_MAX_CONCURRENT_TOTAL` | Caps on simultaneous lab containers |
| `DOCKER_SOCKET` | Optional override if Docker isn't reachable at the OS default socket/pipe |

### 3. Frontend Setup (Angular)

```bash
cd frontend
npm install
# Edit src/environments/environment.ts with your Supabase credentials and backend API URL
npm start
# Opens http://localhost:4200 automatically
```

### 4. Docker (for labs)

The backend needs a reachable Docker Engine to start/stop student lab containers (`backend/src/services/docker.service.js`, via `dockerode`). On a normal dev machine with Docker Desktop/Docker Engine running, this works with no extra config — the socket/pipe is auto-detected. Nothing else needs to be running for the rest of the app to work; only the lab-launch flow depends on it.

## Project Structure

```
elearning-platform/
├── database/
│   ├── migrations/          ← numbered SQL files, run in order in Supabase
│   ├── seed.sql              ← sample courses/lessons/labs
│   └── README.md             ← schema + RLS explanation
├── backend/
│   ├── src/
│   │   ├── config/           ← Supabase client, environment
│   │   ├── middleware/       ← auth, role checks, rate limiting, error handling
│   │   ├── controllers/      ← business logic per resource
│   │   ├── routes/           ← API endpoints
│   │   ├── services/         ← docker.service.js (lab container orchestration)
│   │   └── app.js            ← Express setup
│   ├── server.js              ← entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          ← services, guards, interceptors
│   │   │   ├── shared/        ← shared icon system, reusable UI pieces
│   │   │   ├── home/ about/ contact/  ← public marketing pages (no login required)
│   │   │   └── features/
│   │   │       ├── auth/         ← login, signup, password reset
│   │   │       ├── student/      ← catalog, course/lesson detail, labs, progress, recommendations
│   │   │       ├── tutor/        ← dashboard, Q&A moderation, student progress, drop-off analytics
│   │   │       ├── manage/       ← tutor/admin course + content authoring
│   │   │       ├── admin/        ← user management, site content editing
│   │   │       ├── profile/      ← account, badges, saved courses
│   │   │       └── staff-catalog/← read-only course browsing/preview for tutors & admins
│   │   ├── environments/
│   │   └── styles.css        ← design tokens ("Signal & Ledger" theme system)
│   ├── angular.json
│   └── package.json
└── PROJECT_README.md (this file)
```

## How It Works

### Authentication
1. Users sign up/log in via **Supabase Auth**, called directly from the Angular app — this backend never handles passwords or issues its own tokens.
2. Supabase returns a JWT access token; Angular stores the session (via `@supabase/supabase-js`) and attaches `Authorization: Bearer <token>` to every API request.
3. The backend's `authenticate` middleware verifies the token against Supabase and attaches a **request-scoped Supabase client** (`req.supabase`) that acts *as that user* — so **Row Level Security (RLS) policies enforce data access at the database layer**, not just in application code.
4. A separate service-role client (`getAdminClient()`) exists for the handful of operations that must bypass RLS by design (e.g. writing lab session records, aggregating anonymous rating stats) — everything else that reads/writes user-owned data goes through `req.supabase` specifically so ownership policies actually apply.

### Key Tables
- `profiles` — extends Supabase Auth with `role` (student/tutor/admin)
- `courses` → `modules` → `lessons` — course content hierarchy
- `labs` — Docker lab metadata (image, resource limits, flag hash) attached to a lesson
- `lab_sessions` — running container lifecycle, with concurrency caps enforced atomically in Postgres
- `lab_ratings` — student difficulty ratings, aggregated into a 0–100% difficulty score
- `lesson_resources` — PDFs/attachments (private Storage bucket, magic-byte validated on upload)
- `enrollments` / `progress` — student ↔ course, and per-lesson completion tracking
- `tutor_assignments` — tutor ↔ student mapping (optionally scoped to a specific course, or unrestricted)
- `questions` — lesson Q&A, with answered/dismissed ("mark as read") states
- `notifications`, `user_streaks` — in-app notifications and daily streak tracking
- `site_settings` — admin-editable public site copy (Home hero/features/CTA, About Us, Contact email)
- `audit_logs` — login/lab/flag-submit trail

### Lab Orchestration
Starting a lab creates a `lab_sessions` row and asynchronously pulls/starts a Docker container scoped to that lesson's `labs` config (image, CPU/memory limits, service port). Each session gets a unique, high-entropy flag; submitting the correct flag records a `lab_submissions` row. Containers run on an isolated bridge network with inter-container communication disabled, auto-expire on a timer, and are reconciled against the database on backend boot (crash recovery). Per-student and platform-wide concurrency caps are enforced atomically in a single Postgres function to avoid race conditions under concurrent requests.

## Role-Based Views

### Student
Browse/enroll in published courses, work through lessons (theory, video, PDFs), launch labs and submit flags, rate lab difficulty, ask lesson questions, track streaks/badges/progress, save courses for later, get course recommendations.

### Tutor
Create/edit their own courses (modules, lessons, labs) — enforced by RLS, not just a role check, so one tutor can't edit another's course. View progress for assigned students. Read-only access to full content (including labs) for any course an assigned student is actually enrolled in, even if authored by another tutor. Moderate Q&A (answer or dismiss questions). View drop-off analytics.

### Admin
Everything a tutor can do, plus: manage all users (promote/demote roles), assign tutors to students, publish/delete any course, and edit public site content (Home page hero/features/CTA, About Us, Contact email) via the Site Content tab.

## Security Notes

This app has been through an explicit security-hardening pass. Notable measures already in place:
- Content write endpoints use the caller's own RLS-scoped client, not the service-role client, so DB-level ownership policies are actually enforced.
- File uploads (course thumbnails, lesson PDFs) are validated against their real magic-byte signature, not just the client-declared `Content-Type`.
- A global API rate limiter plus a stricter one on lab flag submission.
- Lab session start/cap-checking is atomic (Postgres advisory lock) to close a concurrency race.
- Generic "Invalid login credentials" errors (via Supabase Auth) avoid account-enumeration — the frontend deliberately cannot distinguish "wrong password" from "no such account."
- Docker lab containers run with default (non-privileged) capabilities, resource limits, and no access to the Docker host's socket.




