import { getAdminClient } from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const getMe = (req, res) => {
  res.json({
    user: { id: req.user.id, email: req.user.email },
    profile: req.profile,
  });
};

export const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, bio, avatar_url } = req.body;

  const updates = {};
  if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
  if (bio       !== undefined) updates.bio       = bio?.trim()       || null;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url?.trim() || null;

  if (Object.keys(updates).length === 0) throw new ApiError(400, 'No fields to update');

  const { data, error } = await getAdminClient()
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error || !data) throw new ApiError(500, error?.message || 'Update failed');

  res.json({ profile: data });
});
