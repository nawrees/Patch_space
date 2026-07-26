import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { listCollaborators, listEligibleCollaborators, grantCollaborator, revokeCollaborator } from '../controllers/collaborators.controller.js';

const router = Router();

router.get('/courses/:courseId/collaborators', authenticate, requireRole('admin', 'tutor'), listCollaborators);
router.get('/courses/:courseId/collaborators/eligible', authenticate, requireRole('admin', 'tutor'), listEligibleCollaborators);
router.post('/courses/:courseId/collaborators', authenticate, requireRole('admin', 'tutor'), grantCollaborator);
router.delete('/courses/:courseId/collaborators/:tutorId', authenticate, requireRole('admin', 'tutor'), revokeCollaborator);

export default router;
