import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { listUsers, updateUserRole, assignTutor } from '../controllers/admin.controller.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/users', authenticate, adminOnly, listUsers);
router.put('/users/:id/role', authenticate, adminOnly, updateUserRole);
router.post('/tutor-assignments', authenticate, adminOnly, assignTutor);

export default router;
