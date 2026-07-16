import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw new ApiError(400, error.message);
  res.json({ notifications: data ?? [] });
});

export const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await req.supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw new ApiError(400, error.message);
  res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const { error } = await req.supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) throw new ApiError(400, error.message);
  res.json({ success: true });
});
