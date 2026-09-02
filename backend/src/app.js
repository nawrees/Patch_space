import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
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

// Also write access logs to a stable, bind-mounted path (see
// docker-compose.yml's backend volumes) so Wazuh's FIM/log-collection can
// point at a fixed host path — Docker's own default json-file log location
// embeds the container ID, which changes every time the container gets
// recreated (every deploy), making it useless as a stable watch target.
// 'combined' format specifically so Wazuh's built-in Apache/web-log
// decoders parse it with zero custom decoder work.
if (env.NODE_ENV === 'production') {
  const logsDir = path.join(process.cwd(), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const accessLogStream = createStream('access.log', {
    interval: '1d',
    maxFiles: 14,
    path: logsDir,
  });
  app.use(morgan('combined', { stream: accessLogStream }));
}

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', apiLimiter, routes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

export default app;
