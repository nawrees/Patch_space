import { getUserClient, getAdminClient } from '../config/supabaseClient.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from './asyncHandler.js';

/**
 * Expects `Authorization: Bearer <supabase-access-token>`.
 * The token is whatever the Angular app got back from supabase-js after
 * sign-in — this backend never handles passwords or issues its own tokens.
 *
 * On success, attaches:
 *   req.supabase -> RLS-scoped client (acts AS this user)
 *   req.user     -> { id, email, ... } from Supabase Auth
 *   req.profile  -> { id, email, full_name, role } from public.profiles
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Missing bearer token');
  }

  // Use the admin client to verify the token. Calling auth.getUser(jwt) on a
  // user-scoped client with persistSession:false throws "Auth session missing!"
  // in Supabase JS v2 because there is no internal session to lock against.
  // The admin client has no such constraint and validates the JWT correctly.
  const { data: authData, error: authError } = await getAdminClient().auth.getUser(token);

  if (authError || !authData?.user) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const userClient = getUserClient(token);
  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new ApiError(403, 'No profile found for this account');
  }

  req.supabase = userClient;
  req.user = authData.user;
  req.profile = profile;
  next();
});
