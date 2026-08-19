import crypto from 'node:crypto';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getAdminClient } from '../config/supabaseClient.js';
import { recordActivity } from './streaks.controller.js';
import { getLabRatingStats } from '../utils/ratingStats.js';
import { env } from '../config/env.js';
import {
  pullImage,
  startContainer,
  stopContainer,
  getContainerLogs,
  isContainerRunning,
  listLabContainerIds,
} from '../services/docker.service.js';

// FLAG{<32 lowercase hex chars>} — 128 bits of entropy. Several of the lab
// Docker images (idor-*, mass-assignment-*) hard-validate the flag against
// exactly this pattern in their own init_db.py and refuse to start
// otherwise; a "readable" attack-name-prefixed format was tried here
// briefly but silently broke every session for those images (container
// exits immediately, session goes straight to 'error') — confirmed by
// running the images directly and reading their entrypoint/init scripts.
function buildSessionFlag() {
  return `FLAG{${crypto.randomBytes(16).toString('hex')}}`;
}

// Stops the container (if any) and marks a session expired. Shared by the
// on-demand check in getSession and the periodic sweep below, so an
// abandoned session's container gets cleaned up whether or not anyone
// ever polls it again.
async function expireSession(session) {
  if (session.container_id) {
    await stopContainer(session.container_id).catch(() => {});
  }
  await getAdminClient()
    .from('lab_sessions')
    .update({ status: 'expired', stopped_at: new Date().toISOString() })
    .eq('id', session.id);
}

// ─── Periodic sweep: catches sessions nobody ever polled again ──────────────
// getSession() only expires a session when its status is checked; a student
// who closes the tab and never returns would otherwise leave their container
// running forever. Called on an interval from server.js.
export async function sweepExpiredSessions() {
  const admin = getAdminClient();
  const { data: expired } = await admin
    .from('lab_sessions')
    .select('id, container_id')
    .in('status', ['provisioning', 'running'])
    .lt('expires_at', new Date().toISOString());

  for (const session of expired ?? []) {
    await expireSession(session).catch((err) =>
      console.error('[LabSweep] Failed to expire session', session.id, err.message)
    );
  }
  return expired?.length ?? 0;
}

// ─── Boot-time reconciliation: one-time sweep, not a recurring poll ─────────
// If the backend crashes or restarts, any in-memory tracking of "provisioning"
// sessions is lost, and containers can be left running with nothing to stop
// them. On startup, reconcile DB state against actual Docker state:
//   - Docker containers with no matching active session → orphaned, remove.
//   - DB sessions still 'provisioning' → no process survives a restart to
//     finish them, so they're definitionally stale.
//   - DB sessions 'running' whose container no longer exists → mark error.
export async function reconcileOnBoot() {
  const admin = getAdminClient();

  const { data: activeSessions } = await admin
    .from('lab_sessions')
    .select('id, status, container_id')
    .in('status', ['provisioning', 'running']);

  const activeContainerIds = new Set(
    (activeSessions ?? []).filter((s) => s.container_id).map((s) => s.container_id)
  );

  const allLabContainerIds = await listLabContainerIds();
  const orphanIds = allLabContainerIds.filter((id) => !activeContainerIds.has(id));
  for (const id of orphanIds) {
    await stopContainer(id).catch((err) =>
      console.warn('[Reconcile] Failed to remove orphan container', id, err.message)
    );
  }

  for (const session of activeSessions ?? []) {
    if (session.status === 'provisioning') {
      if (session.container_id) await stopContainer(session.container_id).catch(() => {});
      await admin.from('lab_sessions').update({ status: 'error' }).eq('id', session.id);
      continue;
    }
    if (session.container_id && !(await isContainerRunning(session.container_id))) {
      await admin.from('lab_sessions').update({ status: 'error' }).eq('id', session.id);
    }
  }

  if (orphanIds.length) {
    console.log(`[Reconcile] Removed ${orphanIds.length} orphaned lab container(s) on boot`);
  }
}

// ─── GET /api/labs/:labId/session ────────────────────────────────────────────
// Returns the student's current active session (provisioning or running),
// including secondsRemaining and submission history.
export const getSession = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const admin = getAdminClient();

  const { data: session } = await admin
    .from('lab_sessions')
    .select('*')
    .eq('lab_id', labId)
    .eq('student_id', req.user.id)
    .in('status', ['provisioning', 'running'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return res.json({ session: null, submissions: [], userRating: null });

  // Auto-expire: if expires_at has passed, transition to expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await expireSession(session);
    return res.json({ session: { ...session, status: 'expired' }, submissions: [] });
  }

  // Check whether the container is still up (may have crashed)
  if (session.status === 'running' && session.container_id) {
    const running = await isContainerRunning(session.container_id);
    if (!running) {
      await admin
        .from('lab_sessions')
        .update({ status: 'error' })
        .eq('id', session.id);
      return res.json({ session: { ...session, status: 'error' }, submissions: [] });
    }
  }

  // Fetch submission history for this session
  const { data: submissions } = await admin
    .from('lab_submissions')
    .select('attempt_number, is_correct, submitted_at')
    .eq('lab_session_id', session.id)
    .order('attempt_number', { ascending: false });

  const secondsRemaining = session.expires_at
    ? Math.max(0, Math.floor((new Date(session.expires_at) - Date.now()) / 1000))
    : null;

  // Student's own rating for this lab (if already rated)
  const { data: ratingRow } = await admin
    .from('lab_ratings')
    .select('rating')
    .eq('lab_id', labId)
    .eq('student_id', req.user.id)
    .maybeSingle();

  res.json({
    session: { ...session, secondsRemaining },
    submissions: submissions ?? [],
    userRating: ratingRow?.rating ?? null,
  });
});

// ─── POST /api/labs/:labId/start ─────────────────────────────────────────────
// Creates a lab session immediately (status = provisioning) and returns it.
// The container pull + start happens asynchronously; frontend polls getSession.
export const startLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const admin = getAdminClient();

  // RLS-gated lab fetch: ensures student is enrolled before they can start
  const { data: lab, error: labErr } = await req.supabase
    .from('labs')
    .select('*')
    .eq('id', labId)
    .single();

  if (labErr || !lab) throw new ApiError(404, 'Lab not found or access denied');

  // Per-session random flag: prevents students from sharing flags
  const sessionFlag = buildSessionFlag();
  const sessionFlagHash = crypto.createHash('sha256').update(sessionFlag).digest('hex');

  const expiresAt = new Date(Date.now() + lab.max_duration_minutes * 60 * 1000).toISOString();
  const containerName = `lab-${labId.slice(0, 8)}-${req.user.id.slice(0, 8)}-${Date.now()}`;

  // The duplicate-session check, per-student cap, platform-wide cap, and
  // insert all happen atomically inside this one DB function (advisory-lock
  // guarded) — doing them as separate JS-side queries + a later insert would
  // let concurrent requests all pass the checks before any row existed.
  const { data: session, error: sessErr } = await admin.rpc('start_lab_session', {
    p_student_id: req.user.id,
    p_lab_id: labId,
    p_container_name: containerName,
    p_session_flag_hash: sessionFlagHash,
    p_expires_at: expiresAt,
    p_max_per_student: env.LAB_MAX_CONCURRENT_PER_STUDENT,
    p_max_total: env.LAB_MAX_CONCURRENT_TOTAL,
  }).single();

  if (sessErr) {
    if (sessErr.message?.includes('ACTIVE_SESSION_EXISTS')) {
      throw new ApiError(409, 'A lab session is already active — stop it first');
    }
    if (sessErr.message?.includes('STUDENT_CAP_REACHED')) {
      throw new ApiError(429, `You have reached the limit of ${env.LAB_MAX_CONCURRENT_PER_STUDENT} simultaneous labs — stop one before starting another`);
    }
    if (sessErr.message?.includes('PLATFORM_CAP_REACHED')) {
      throw new ApiError(503, 'Lab capacity is full right now — try again shortly');
    }
    throw new ApiError(500, 'Failed to create lab session');
  }

  res.status(201).json({ session });

  // Background: pull image + start container, then update session to 'running'
  ;(async () => {
    let containerId;
    try {
      await pullImage(lab.docker_image);

      // Check if the student cancelled while the image was pulling
      const { data: current } = await admin
        .from('lab_sessions').select('status').eq('id', session.id).maybeSingle();
      if (current?.status !== 'provisioning') {
        console.log('[LabStart] Session was cancelled during pull — aborting container start');
        return;
      }

      const result = await startContainer({
        dockerImage: lab.docker_image,
        cpuLimit: lab.cpu_limit,
        memoryLimitMb: lab.memory_limit_mb,
        servicePort: lab.service_port ?? 80,
        containerName,
        flag: sessionFlag,
      });
      containerId = result.containerId;

      // Final check: don't override a stop/cancel that happened during container start
      const { data: latest } = await admin
        .from('lab_sessions').select('status').eq('id', session.id).maybeSingle();
      if (latest?.status !== 'provisioning') {
        console.log('[LabStart] Session was cancelled during container start — cleaning up');
        await stopContainer(containerId).catch(() => {});
        return;
      }

      const accessUrl = `http://${env.LAB_HOST}:${result.assignedPort}`;
      await admin
        .from('lab_sessions')
        .update({
          status: 'running',
          container_id: containerId,
          access_url: accessUrl,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', session.id);
    } catch (err) {
      console.error('[LabStart] Container start failed:', err.message);
      await admin
        .from('lab_sessions')
        .update({ status: 'error' })
        .eq('id', session.id);
    }
  })();
});

// ─── DELETE /api/labs/:labId/session ─────────────────────────────────────────
export const stopLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const admin = getAdminClient();

  const { data: session } = await admin
    .from('lab_sessions')
    .select('id, container_id')
    .eq('lab_id', labId)
    .eq('student_id', req.user.id)
    .in('status', ['provisioning', 'running'])
    .maybeSingle();

  if (!session) throw new ApiError(404, 'No active session to stop');

  if (session.container_id) {
    await stopContainer(session.container_id);
  }

  await admin
    .from('lab_sessions')
    .update({ status: 'stopped', stopped_at: new Date().toISOString() })
    .eq('id', session.id);

  res.json({ message: 'Lab session stopped' });
});

// ─── POST /api/labs/:labId/submit ────────────────────────────────────────────
export const submitFlag = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { flag } = req.body;
  if (!flag?.trim()) throw new ApiError(400, 'flag is required');

  const admin = getAdminClient();

  const { data: session } = await admin
    .from('lab_sessions')
    .select('id, session_flag_hash')
    .eq('lab_id', labId)
    .eq('student_id', req.user.id)
    .eq('status', 'running')
    .maybeSingle();

  if (!session) throw new ApiError(404, 'No running session — start the lab first');

  // Resolve expected hash: per-session flag takes priority over static lab flag
  let expectedHash = session.session_flag_hash;
  if (!expectedHash) {
    const { data: lab } = await req.supabase
      .from('labs')
      .select('flag_hash, lesson_id')
      .eq('id', labId)
      .single();
    expectedHash = lab?.flag_hash;
    if (!expectedHash) throw new ApiError(400, 'This lab has no flag configured yet');
  }

  const submittedHash = crypto.createHash('sha256').update(flag.trim()).digest('hex');
  const isCorrect = submittedHash === expectedHash;

  // Count prior attempts for this session
  const { count } = await admin
    .from('lab_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('lab_session_id', session.id);

  await admin.from('lab_submissions').insert({
    lab_session_id: session.id,
    student_id: req.user.id,
    lab_id: labId,
    submitted_flag: submittedHash, // never store plaintext
    is_correct: isCorrect,
    attempt_number: (count ?? 0) + 1,
  });

  if (isCorrect) {
    recordActivity(req.user.id).catch(() => {}); // fire-and-forget

    // Mark lesson progress as completed
    const { data: lab } = await req.supabase
      .from('labs')
      .select('lesson_id')
      .eq('id', labId)
      .single();

    if (lab?.lesson_id) {
      await req.supabase.from('progress').upsert(
        {
          student_id: req.user.id,
          lesson_id: lab.lesson_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,lesson_id' }
      );
    }
  }

  res.json({ isCorrect, attemptsUsed: (count ?? 0) + 1 });
});

// ─── POST /api/labs/:labId/rate ──────────────────────────────────────────────
export const rateLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'rating must be 1–5');

  const admin = getAdminClient();

  // Only let students rate labs they have actually solved
  const { data: solved } = await admin
    .from('lab_submissions')
    .select('id')
    .eq('lab_id', labId)
    .eq('student_id', req.user.id)
    .eq('is_correct', true)
    .limit(1)
    .maybeSingle();

  if (!solved) throw new ApiError(403, 'Solve the lab before rating it');

  await admin.from('lab_ratings').upsert(
    { lab_id: labId, student_id: req.user.id, rating },
    { onConflict: 'lab_id,student_id' }
  );

  const stats = await getLabRatingStats(admin, labId);

  res.json({ ...stats, userRating: rating });
});

// ─── GET /api/labs/:labId/logs ───────────────────────────────────────────────
export const getLogs = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const admin = getAdminClient();

  const { data: session } = await admin
    .from('lab_sessions')
    .select('container_id')
    .eq('lab_id', labId)
    .eq('student_id', req.user.id)
    .eq('status', 'running')
    .maybeSingle();

  if (!session?.container_id) throw new ApiError(404, 'No running container for this lab');

  const logs = await getContainerLogs(session.container_id, 100);
  res.json({ logs });
});
