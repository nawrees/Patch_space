import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getStreak } from '../controllers/streaks.controller.js';

const router = Router();

router.get('/streaks', authenticate, getStreak);

export default router;
