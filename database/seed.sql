-- =========================================================
-- Sample content for local development / demos.
-- Run AFTER all migrations (001 -> 012).
-- Uses fixed UUIDs/slugs so it's not safe to re-run without cleaning up first.
-- =========================================================

insert into public.courses (id, title, slug, description, category, difficulty, is_published)
values (
  '11111111-1111-1111-1111-111111111111',
  'Introduction to Web Application Security',
  'intro-web-appsec',
  'Learn the OWASP Top 10 through guided theory and hands-on Docker labs.',
  'AppSec',
  'beginner',
  true
);

insert into public.modules (id, course_id, title, description, order_index)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'SQL Injection', 'Understand and exploit SQL injection vulnerabilities.', 1),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Cross-Site Scripting (XSS)', 'Reflected, stored and DOM-based XSS.', 2);

insert into public.lessons (id, module_id, title, lesson_type, content, order_index)
values
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'What is SQL Injection?', 'theory', '# SQL Injection

SQL injection happens when untrusted input is concatenated into a SQL query without proper sanitisation or parameterisation...', 1),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222221', 'Lab: Exploit a Login Form', 'lab', null, 2);

-- A PDF cheat-sheet attached to the theory lesson.
-- storage_path assumes you uploaded the file to:
--   <bucket: lesson-resources>/11111111-1111-1111-1111-111111111111/33333333-3333-3333-3333-333333333331/sqli-cheatsheet.pdf
insert into public.lesson_resources (lesson_id, title, resource_type, storage_path, mime_type)
values (
  '33333333-3333-3333-3333-333333333331',
  'SQL Injection Cheat Sheet',
  'pdf',
  '11111111-1111-1111-1111-111111111111/33333333-3333-3333-3333-333333333331/sqli-cheatsheet.pdf',
  'application/pdf'
);

insert into public.labs (lesson_id, title, description, instructions, docker_image, max_duration_minutes, flag_hash)
values (
  '33333333-3333-3333-3333-333333333332',
  'Vulnerable Login Lab',
  'A deliberately vulnerable login form running in an isolated container.',
  'Bypass the login form using a SQL injection payload and retrieve the flag.',
  'yourregistry/labs-sqli-login:latest',
  45,
  encode(digest('FLAG{example_flag_value}', 'sha256'), 'hex')
);
