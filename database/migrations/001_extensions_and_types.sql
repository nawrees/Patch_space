-- =========================================================
-- Extensions
-- =========================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid(), digest() for flag hashing

-- =========================================================
-- Enum types
-- =========================================================
create type public.user_role as enum ('student', 'tutor', 'admin');
create type public.enrollment_status as enum ('active', 'completed', 'dropped');
create type public.lesson_type as enum ('theory', 'video', 'quiz', 'lab');
create type public.lab_session_status as enum ('provisioning', 'running', 'stopped', 'expired', 'error');
create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
