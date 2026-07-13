import { ApiError } from '../utils/ApiError.js';

/**
 * Quick role check for nicer error messages and to keep obviously-wrong
 * requests from ever reaching a query. The database's RLS policies are
 * the real enforcement layer — this is a courtesy gate, not a substitute.
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.profile || !roles.includes(req.profile.role)) {
    return next(new ApiError(403, `This action requires role: ${roles.join(' or ')}`));
  }
  next();
};
