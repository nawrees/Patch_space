-- =========================================================
-- Row Level Security
-- =========================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.labs enable row level security;
alter table public.enrollments enable row level security;
alter table public.tutor_assignments enable row level security;
alter table public.progress enable row level security;
alter table public.lab_sessions enable row level security;
alter table public.lab_submissions enable row level security;
alter table public.audit_logs enable row level security;

-- ---------- profiles ----------
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or public.is_tutor_of(id)                                                                -- tutor viewing an assigned student
    or id in (select tutor_id from public.tutor_assignments where student_id = auth.uid())    -- student viewing their own tutor
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
  -- role escalation is separately blocked by trg_protect_profile_role

-- ---------- courses ----------
create policy "courses_select" on public.courses
  for select using (
    is_published = true or created_by = auth.uid() or public.is_admin()
  );

create policy "courses_insert" on public.courses
  for insert with check (
    public.is_admin() or public.current_app_role() = 'tutor'
  );

create policy "courses_update" on public.courses
  for update using (created_by = auth.uid() or public.is_admin());

create policy "courses_delete" on public.courses
  for delete using (created_by = auth.uid() or public.is_admin());

-- ---------- modules (browsable for any published course) ----------
create policy "modules_select" on public.modules
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = modules.course_id
        and (c.is_published = true or c.created_by = auth.uid())
    )
  );

create policy "modules_write" on public.modules
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = modules.course_id and c.created_by = auth.uid()
    )
  );

-- ---------- lessons (full content requires enrollment) ----------
create policy "lessons_select" on public.lessons
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(lessons.id))
  );

create policy "lessons_write" on public.lessons
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.created_by = auth.uid()
    )
  );

-- ---------- lesson_resources (metadata only — file bytes go through the backend) ----------
create policy "lesson_resources_select" on public.lesson_resources
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_resources.lesson_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(lesson_resources.lesson_id))
  );

create policy "lesson_resources_write" on public.lesson_resources
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_resources.lesson_id and c.created_by = auth.uid()
    )
  );

-- ---------- labs (same visibility as their parent lesson) ----------
create policy "labs_select" on public.labs
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      join public.lessons l on l.module_id = m.id
      where l.id = labs.lesson_id and c.created_by = auth.uid()
    )
    or public.is_enrolled(public.course_of_lesson(labs.lesson_id))
  );

create policy "labs_write" on public.labs
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      join public.lessons l on l.module_id = m.id
      where l.id = labs.lesson_id and c.created_by = auth.uid()
    )
  );

-- ---------- enrollments ----------
create policy "enrollments_select" on public.enrollments
  for select using (
    student_id = auth.uid() or public.is_tutor_of(student_id) or public.is_admin()
  );

create policy "enrollments_insert" on public.enrollments
  for insert with check (
    student_id = auth.uid() or public.is_admin() or public.current_app_role() = 'tutor'
  );

create policy "enrollments_update" on public.enrollments
  for update using (student_id = auth.uid() or public.is_admin());

-- ---------- tutor_assignments (admin-managed) ----------
create policy "tutor_assignments_select" on public.tutor_assignments
  for select using (
    tutor_id = auth.uid() or student_id = auth.uid() or public.is_admin()
  );

create policy "tutor_assignments_write" on public.tutor_assignments
  for all using (public.is_admin());

-- ---------- progress ----------
create policy "progress_select" on public.progress
  for select using (
    student_id = auth.uid() or public.is_tutor_of(student_id) or public.is_admin()
  );

create policy "progress_insert" on public.progress
  for insert with check (student_id = auth.uid() or public.is_admin());

create policy "progress_update" on public.progress
  for update using (student_id = auth.uid() or public.is_admin());

-- ---------- lab_sessions (read-only for clients; backend writes via service role) ----------
create policy "lab_sessions_select" on public.lab_sessions
  for select using (
    student_id = auth.uid() or public.is_tutor_of(student_id) or public.is_admin()
  );

-- ---------- lab_submissions (read-only for clients; backend writes via service role) ----------
create policy "lab_submissions_select" on public.lab_submissions
  for select using (
    student_id = auth.uid() or public.is_tutor_of(student_id) or public.is_admin()
  );

-- ---------- audit_logs (admin-only; backend writes via service role) ----------
create policy "audit_logs_select" on public.audit_logs
  for select using (public.is_admin());
