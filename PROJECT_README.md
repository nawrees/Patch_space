# Cybersecurity E-Learning Platform

A complete stack for teaching cybersecurity: students learn theory, watch videos, take quizzes, and run isolated Docker labs. Tutors track student progress. Admins manage users and courses.

**Stack:** Angular 18 (frontend) + Node.js/Express (backend) + Supabase/Postgres (database) + Docker (labs)

## Quick Start

### 1. Database Setup (Supabase)

1. Create a new project at supabase.com
2. Go to Project → Settings → API and copy:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`
3. Open the SQL Editor and run all files in `database/migrations/` **in order** (001 → 012)
4. (Optional) Run `database/seed.sql` for sample data
5. Create a Storage bucket:
   - Storage → New bucket → name it `lesson-resources` → mark **private** → create
   - Leave it with no client-facing policies (this is the security model)

### 2. Backend Setup (Node.js)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials (from step 1)
npm run dev
# Should print: "API listening on http://localhost:4000"
```

### 3. Frontend Setup (Angular)

```bash
cd frontend
npm install
# Edit src/environments/environment.ts with your Supabase credentials and backend URL
npm start
# Opens http://localhost:4200 automatically
```

## Project Structure

```
elearning-platform/
├── database/
│   ├── migrations/          ← 12 SQL files, run in order in Supabase
│   ├── seed.sql             ← sample courses/lessons/labs
│   └── README.md            ← database schema + RLS explanation
├── backend/
│   ├── src/
│   │   ├── config/          ← Supabase client, environment
│   │   ├── middleware/      ← auth, role checks, error handling
│   │   ├── controllers/     ← business logic for each resource
│   │   ├── routes/          ← API endpoints
│   │   └── app.js           ← Express setup
│   ├── server.js            ← entry point
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/        ← services, guards, interceptors
│   │   │   ├── features/    ← feature modules (auth, student, tutor, admin)
│   │   │   └── app.*.ts     ← main app component + routes
│   │   ├── environments/    ← config for dev/prod
│   │   ├── styles.css       ← global styles
│   │   └── index.html
│   ├── angular.json
│   ├── tsconfig.json
│   ├── package.json
│   └── README.md
└── [database / backend / frontend READMEs with detailed setup]
```

## How It Works

### Authentication
1. User signs up/logs in via **Supabase Auth** (no passwords stored in our database).
2. Supabase returns an **access token** (JWT).
3. Angular stores this token and includes it in every API request as `Authorization: Bearer <token>`.
4. Backend verifies the token and forwards the user's identity to Supabase queries.
5. **Row Level Security (RLS)** enforces what each user sees:
   - Students only see courses they're enrolled in.
   - Tutors only see their assigned students.
   - Admins see everything.

### Key Tables
- `profiles` — extends Supabase Auth with `role` (student/tutor/admin)
- `courses` → `modules` → `lessons` — course content hierarchy
- `lesson_resources` — PDFs, slides, attachments (stored in private Supabase Storage bucket)
- `labs` — Docker lab metadata (image, duration, flag hash)
- `enrollments` — student ↔ course
- `progress` — per-student, per-lesson tracking
- `lab_sessions` — running container lifecycle (backend-only writes)
- `tutor_assignments` — tutor ↔ student mapping
- `audit_logs` — login/lab/flag-submit trail

## Role-Based Views

### Student
- Browse published courses
- Enroll in courses
- View enrolled courses + lessons + PDFs
- Track own progress
- Access labs (coming next)

### Tutor
- Create/edit courses
- View assigned students + their progress
- Later: flag submissions, grading

### Admin
- Manage all users (promote to tutor/admin)
- Create/publish/delete courses
- Assign tutors to students

## Not Yet Implemented

- **Lab orchestration** — spinning up Docker containers per lab attempt
- **Lab submission UI** — flag/answer submission and verification
- **Course/lesson detail views** — full UI for browsing content
- **PDF viewer** — embedded PDF viewing in lessons
- **Form validation** — client-side input checks
- **Error handling** — toast notifications, error pages
- **Wazuh integration** — security monitoring in lab containers (mentioned for later)

## Next Steps

1. **Test the login flow:**
   - Backend running → Frontend open → sign up with an email
   - You should see a role-based dashboard (student by default)

2. **Test role promotion:**
   - Manually update `profiles` in Supabase SQL Editor:
     ```sql
     update public.profiles set role = 'tutor' where email = 'tutor@example.com';
     ```
   - Log out and back in — navbar should change

3. **Test course browsing:**
   - Student logs in → "Browse Courses" → see sample course from `seed.sql`
   - Enroll → see it on dashboard

4. **Next big feature:** Docker lab orchestration
   - Flesh out `lab_sessions` table writes (backend spins up container)
   - Build lab launcher UI (shows container status, terminal, etc.)
   - Wire up flag submission + verification

## Folder Notes

- **`database/`** — source of truth for schema. Keep this in version control. If you ever need a fresh Supabase project, re-run these files.
- **`backend/`** — Node.js API. Stateless (except for in-memory Supabase clients), can scale horizontally.
- **`frontend/`** — Angular SPA. Compiled to `dist/` for deployment.

## Deployment

Eventually:
- **Frontend** → Vercel, Netlify, or S3 + CloudFront
- **Backend** → Heroku, Railway, Render, or Docker on your own infrastructure
- **Database** → already on Supabase (managed cloud Postgres)
- **Docker hosts** — dedicated VM(s) with Docker Engine, network accessible from backend

For now, develop locally with `npm run dev` (backend) and `npm start` (frontend).

---

Questions? Read the individual READMEs in each folder for deeper technical explanations of auth flow, API endpoints, RLS, and architecture.
