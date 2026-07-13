import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let adminClient;

/**
 * Service-role client. Bypasses Row Level Security entirely.
 * Use ONLY for the handful of things that must be server-controlled:
 * Storage signed URLs / uploads, and later, lab session + audit log writes.
 * Never expose this key, and never use this client to answer a request
 * on a user's behalf without first checking permissions yourself.
 */
export function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/**
 * Per-request client authenticated as the calling user (their Supabase
 * access token is forwarded as the Authorization header). All queries
 * made through this client are subject to Postgres Row Level Security,
 * so most of our authorization logic lives in the database migrations,
 * not duplicated here in JavaScript.
 */
export function getUserClient(accessToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
