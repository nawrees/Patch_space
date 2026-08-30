import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();

// Exactly one reverse proxy sits in front of this app in production
// (frontend's nginx, proxying /api — see frontend/nginx.conf) — trusting
// only that one hop means req.ip correctly reflects the real client from
// X-Forwarded-For instead of always showing the proxy's own internal
// Docker network address, which would otherwise make every request look
// like it came from the same "IP" and silently break flagSubmitLimiter's
// and apiLimiter's per-user/per-IP rate limiting.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', apiLimiter, routes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

export default app;
