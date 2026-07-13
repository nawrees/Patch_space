import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMyProgress, upsertMyProgress, getStudentProgress, getContinueLearning } from '../controllers/progress.controller.js';

const router = Router();

router.get('/me', authenticate, getMyProgress);
router.get('/continue', authenticate, getContinueLearning);
router.put('/lessons/:lessonId', authenticate, upsertMyProgress);
router.get('/students/:studentId', authenticate, getStudentProgress);

export default router;
