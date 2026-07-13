import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { listMyStudents, getStudentOverview } from '../controllers/tutors.controller.js';

const router = Router();
const tutorOnly = requireRole('tutor', 'admin');

router.get('/me/students', authenticate, tutorOnly, listMyStudents);
router.get('/students/:studentId/overview', authenticate, tutorOnly, getStudentOverview);

export default router;
