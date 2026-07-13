import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  getLesson,
  updateLesson,
  deleteLesson,
  upsertLab,
  deleteLab,
} from '../controllers/content.controller.js';

const router = Router();
const staffOnly = requireRole('admin', 'tutor');

router.post('/courses/:courseId/modules', authenticate, staffOnly, createModule);
router.put('/modules/:id', authenticate, staffOnly, updateModule);
router.delete('/modules/:id', authenticate, staffOnly, deleteModule);

router.post('/modules/:moduleId/lessons', authenticate, staffOnly, createLesson);
router.get('/lessons/:id', authenticate, getLesson);
router.put('/lessons/:id', authenticate, staffOnly, updateLesson);
router.delete('/lessons/:id', authenticate, staffOnly, deleteLesson);

router.post('/lessons/:lessonId/lab', authenticate, staffOnly, upsertLab);
router.delete('/labs/:id', authenticate, staffOnly, deleteLab);

export default router;
