import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller.js';

const router = Router();

// authenticate applied per-route (not as router.use(authenticate)) — a
// blanket router-level middleware here runs for every request that passes
// through this router, including ones bound for sibling routers mounted
// after it at the same '/' path, silently blocking otherwise-public routes
// like GET /site-settings before they're ever reached.
router.get('/notifications',             authenticate, getNotifications);
router.patch('/notifications/read-all',  authenticate, markAllRead);
router.patch('/notifications/:id/read',  authenticate, markRead);

export default router;
