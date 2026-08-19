import { asyncHandler } from '../middleware/asyncHandler.js';
import { getAdminClient } from '../config/supabaseClient.js';

const todayStr  = () => new Date().toISOString().split('T')[0];
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

// Internal helper called by progress + labs controllers on any completion event.
// Not exported as a route handler.
export async function recordActivity(userId) {
  const admin = getAdminClient();
  const today = todayStr();
  const yesterday = yesterdayStr();

  const { data: existing } = await admin
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    await admin.from('user_streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    });
    return { current_streak: 1, longest_streak: 1, active_today: true };
  }

  if (existing.last_activity_date === today) {
    return {
      current_streak: existing.current_streak,
      longest_streak: existing.longest_streak,
      active_today: true,
    };
  }

  const newCurrent = existing.last_activity_date === yesterday
    ? existing.current_streak + 1
    : 1;
  const newLongest = Math.max(newCurrent, existing.longest_streak);

  await admin.from('user_streaks').update({
    current_streak: newCurrent,
    longest_streak: newLongest,
    last_activity_date: today,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return { current_streak: newCurrent, longest_streak: newLongest, active_today: true };
}

// GET /api/streaks
export const getStreak = asyncHandler(async (req, res) => {
  const admin = getAdminClient();
  const today = todayStr();
  const yesterday = yesterdayStr();

  const { data } = await admin
    .from('user_streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!data) {
    return res.json({ current_streak: 0, longest_streak: 0, last_activity_date: null, active_today: false });
  }

  // Streak is still alive only if the student was active today or yesterday.
  // Anything older means they missed a day — reset to 0.
  const streakAlive = data.last_activity_date === today || data.last_activity_date === yesterday;
  const currentStreak = streakAlive ? data.current_streak : 0;

  if (!streakAlive && data.current_streak > 0) {
    await admin.from('user_streaks')
      .update({ current_streak: 0, updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id);
  }

  res.json({
    current_streak:     currentStreak,
    longest_streak:     data.longest_streak,
    last_activity_date: data.last_activity_date,
    active_today:       data.last_activity_date === today,
  });
});
