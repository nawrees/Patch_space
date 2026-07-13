import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getSession, startLab, stopLab, submitFlag, getLogs, rateLab } from '../controllers/labs.controller.js';

const router = Router();

router.get('/labs/:labId/session', authenticate, getSession);
router.post('/labs/:labId/start', authenticate, startLab);
router.delete('/labs/:labId/session', authenticate, stopLab);
router.post('/labs/:labId/submit', authenticate, submitFlag);
router.get('/labs/:labId/logs', authenticate, getLogs);
router.post('/labs/:labId/rate', authenticate, rateLab);

export default router;
