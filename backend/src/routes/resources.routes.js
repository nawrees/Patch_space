import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  listResources,
  uploadResource,
  getResourceSignedUrl,
  deleteResource,
  uploadMiddleware,
} from '../controllers/resources.controller.js';

const router = Router();
const staffOnly = requireRole('admin', 'tutor');

router.get('/lessons/:lessonId/resources', authenticate, listResources);
router.post('/lessons/:lessonId/resources', authenticate, staffOnly, uploadMiddleware, uploadResource);
router.get('/resources/:resourceId/signed-url', authenticate, getResourceSignedUrl);
router.delete('/resources/:id', authenticate, staffOnly, deleteResource);

export default router;
