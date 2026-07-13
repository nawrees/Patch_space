-- Q&A system: students ask questions on lessons, tutors answer them.
create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  question      text not null,
  answer        text,
  answered_by   uuid references public.profiles(id),
  answered_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_questions_lesson    on public.questions(lesson_id);
create index idx_questions_course    on public.questions(course_id);
create index idx_questions_student   on public.questions(student_id);
create index idx_questions_unanswered on public.questions(created_at) where answered_at is null;

create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.questions enable row level security;

-- Students see their own questions
create policy "students_read_own_questions" on public.questions
  for select using (student_id = auth.uid());

-- Tutors see questions on courses they are assigned to (or all if admin)
create policy "tutors_read_assigned_questions" on public.questions
  for select using (
    public.is_admin()
    or public.is_tutor_of(student_id)
    or exists (
      select 1 from public.tutor_assignments ta
      where ta.tutor_id = auth.uid()
        and (ta.course_id = questions.course_id or ta.course_id is null)
    )
  );

-- Students can insert their own questions
create policy "students_insert_questions" on public.questions
  for insert with check (student_id = auth.uid());

-- Only the answering tutor/admin can update (to add an answer)
create policy "tutors_answer_questions" on public.questions
  for update using (public.is_admin() or public.is_tutor_of(student_id));
