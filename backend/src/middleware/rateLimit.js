import rateLimit from 'express-rate-limit';

// Baseline abuse protection for every /api route — generous enough not to
// bother a real user, tight enough to blunt scripted credential-stuffing/
// scraping bursts against any single endpoint.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Lab flag submission carries real entropy (128 bits), but with zero
// throttling an attacker could still hammer the endpoint indefinitely.
// Keyed per authenticated user (falls back to IP) so one student's
// aggressive polling can't lock out others sharing a NAT/proxy.
export const flagSubmitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});
