import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getSaved, saveCourse, unsaveCourse } from '../controllers/saved.controller.js';

const router = Router();

router.get('/saved',              authenticate, getSaved);
router.post('/saved/:courseId',   authenticate, saveCourse);
router.delete('/saved/:courseId', authenticate, unsaveCourse);

export default router;
