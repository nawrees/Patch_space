-- =========================================================
-- Fix: a course owner couldn't actually see a collaborator's name/email.
-- listCollaborators (collaborators.controller.js) embeds
-- `tutor:tutor_id(full_name, email)` from course_collaborators, but that
-- embedded read is itself subject to RLS on `profiles` — and profiles_select
-- (012_rls_policies.sql) had no clause covering "this profile belongs to a
-- tutor who collaborates on a course I own," so the join silently came back
-- empty and the name never rendered, even though the grant itself worked.
--
-- Adds both directions: an owner can see their collaborators' profiles, and
-- a collaborator can see who granted them access (the controller already
-- selects granter:granted_by(full_name) — same latent gap, fixed for
-- consistency even though the frontend doesn't render it yet).
-- =========================================================

drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or public.is_tutor_of(id)                                                                -- tutor viewing an assigned student
    or id in (select tutor_id from public.tutor_assignments where student_id = auth.uid())    -- student viewing their own tutor
    or exists (                                                                               -- course owner viewing a collaborator's profile
      select 1 from public.course_collaborators cc
      join public.courses c on c.id = cc.course_id
      where cc.tutor_id = profiles.id and c.created_by = auth.uid()
    )
    or exists (                                                                               -- collaborator viewing who granted them access
      select 1 from public.course_collaborators cc
      where cc.granted_by = profiles.id and cc.tutor_id = auth.uid()
    )
  );
