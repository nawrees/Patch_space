import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller.js';

const router = Router();
router.use(authenticate);

router.get('/notifications',             getNotifications);
router.patch('/notifications/read-all',  markAllRead);
router.patch('/notifications/:id/read',  markRead);

export default router;
