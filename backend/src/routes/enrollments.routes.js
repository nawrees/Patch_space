import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  enrollSelf,
  enrollStudent,
  listMyEnrollments,
  updateEnrollment,
} from '../controllers/enrollments.controller.js';

const router = Router();

router.post('/courses/:courseId/enroll', authenticate, requireRole('student'), enrollSelf);
router.post('/enrollments', authenticate, requireRole('admin', 'tutor'), enrollStudent);
router.get('/enrollments/me', authenticate, listMyEnrollments);
router.put('/enrollments/:id', authenticate, updateEnrollment);

export default router;
