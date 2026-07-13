import { getUserClient } from '../config/supabaseClient.js';
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

  const userClient = getUserClient(token);
  const { data: authData, error: authError } = await userClient.auth.getUser(token);

  if (authError || !authData?.user) {
    throw new ApiError(401, 'Invalid or expired token');
  }

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
