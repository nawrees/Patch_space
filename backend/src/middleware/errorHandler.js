import { ApiError } from '../utils/ApiError.js';

export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err && err.message && err.message.includes('Only PDF files are accepted')) {
    return res.status(400).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
