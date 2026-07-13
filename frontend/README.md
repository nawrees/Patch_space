# Frontend — Cybersecurity E-Learning Platform

Angular 18 single-page app (SPA) for students, tutors, and admins.

## Setup

```bash
cd frontend
npm install
npm start  # opens http://localhost:4200
```

## Architecture

### Auth flow
1. **Supabase Auth** (standalone) — sign up/sign in/password reset handled by `AuthService`.
2. **Access token forwarding** — once logged in, every API request gets the user's Supabase token in the `Authorization` header via `AuthInterceptor`.
3. **Backend auth** — `authenticate` middleware verifies that token and loads the user's profile from the database.

### Services
- **`AuthService`** — wraps `supabase-js`, manages sessions and login/logout.
- **`UserService`** — fetches and caches the user's profile and role from `/api/auth/me`.
- **`ApiService`** — generic HTTP wrapper for all backend endpoints (courses, progress, enrollments, etc.).

### Routing & Guards
- Routes are in `app.routes.ts` — structured by role (`/student`, `/tutor`, `/admin`).
- `AuthInterceptor` auto-attaches the bearer token to every request.
- Guard functions could be added to role-specific routes, but in the current skeleton, access is enforced by the backend (RLS + role checks).

### Components

#### Auth (`/features/auth`)
- `LoginComponent` — email/password form
- `SignupComponent` — new account registration

#### Student (`/features/student`)
- `StudentDashboardComponent` — enrolled courses + progress
- `CourseCatalogComponent` — browse and enroll in courses

#### Tutor (`/features/tutor`)
- `TutorDashboardComponent` — list of assigned students

#### Admin (`/features/admin`)
- `AdminDashboardComponent` — user management (placeholder)

### Main layout
- `AppComponent` — navbar with role-based menu, logout button, router outlet.

## Configuration

### Environment files
Edit `src/environments/environment.ts` and `environment.prod.ts` to point at your own Supabase project and backend API:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  apiUrl: 'http://localhost:4000/api',  // or production domain
};
```

## Not built yet (next steps)

- **Course/lesson detail views** — fetching and displaying course modules, lessons, PDFs.
- **Lab launcher** — showing lab sessions, container status, terminal/IDE UI.
- **Progress tracking UI** — visual progress bars, lesson completion forms.
- **Lesson PDF viewer** — embedding signed URLs in an iframe or using a library like `ngx-extended-pdf-viewer`.
- **Form validation** — using Angular Reactive Forms or libraries like Zod/Celebrate.
- **Error handling** — consistent error display, toast notifications.
- **Loading states** — spinners, skeleton screens.

## Running with the backend

Make sure the backend is running (`npm run dev` in the `backend/` folder) before starting the frontend. The frontend will try to contact `http://localhost:4000/api` for all API calls.

If the backend is on a different host/port, update the `apiUrl` in the environment files.
