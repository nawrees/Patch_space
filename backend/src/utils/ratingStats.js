// Shared lab-difficulty-rating aggregation. Ratings are 1 (Very Easy) to
// 5 (Very Hard). Used by labs.controller.js (rateLab), content.controller.js
// (getLesson), and courses.controller.js (getCourse) — previously each of
// the first two computed this inline with duplicated math.

function buildStats(ratings) {
  const totalRatings = ratings.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;

  const avgRating = totalRatings
    ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / totalRatings) * 10) / 10
    : null;

  // Normalize the 1-5 average onto a 0-100% difficulty scale (1 -> 0%, 5 -> 100%).
  const difficultyPercent = avgRating == null ? null : Math.round(((avgRating - 1) / 4) * 100);

  return { avgRating, totalRatings, difficultyPercent, distribution };
}

// Single lab — used where only one lab's stats are needed (a lesson page, or
// right after a student submits a new rating).
export async function getLabRatingStats(supabase, labId) {
  const { data: ratings } = await supabase.from('lab_ratings').select('rating').eq('lab_id', labId);
  return buildStats(ratings ?? []);
}

// Batched — used where many labs' stats are needed at once (a whole course's
// worth of lessons), so it's one query instead of one-per-lab.
export async function getLabRatingStatsBatch(supabase, labIds) {
  const stats = {};
  if (!labIds.length) return stats;

  const { data: ratings } = await supabase.from('lab_ratings').select('lab_id, rating').in('lab_id', labIds);
  const byLab = new Map(labIds.map((id) => [id, []]));
  for (const r of ratings ?? []) {
    if (byLab.has(r.lab_id)) byLab.get(r.lab_id).push(r);
  }
  for (const labId of labIds) stats[labId] = buildStats(byLab.get(labId));
  return stats;
}
