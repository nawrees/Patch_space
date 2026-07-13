import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { getDropOff, getMyPaceStats } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/drop-off/:courseId', authenticate, requireRole('admin', 'tutor'), getDropOff);
router.get('/pace', authenticate, getMyPaceStats);

export default router;
