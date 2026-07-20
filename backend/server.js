import app from './src/app.js';
import { env } from './src/config/env.js';
import { reconcileOnBoot, sweepExpiredSessions } from './src/controllers/labs.controller.js';

const EXPIRY_SWEEP_INTERVAL_MS = 60_000;

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// One-time: clean up any lab containers/sessions left behind by a crash or
// restart before this process started.
reconcileOnBoot().catch((err) => console.error('[Reconcile] Boot sweep failed:', err.message));

// Recurring: catch lab sessions whose timer ran out but nobody polled again
// to trigger the on-demand expiry check in getSession().
setInterval(() => {
  sweepExpiredSessions().catch((err) => console.error('[LabSweep] Failed:', err.message));
}, EXPIRY_SWEEP_INTERVAL_MS);
