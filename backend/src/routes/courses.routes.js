import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadThumbnail,
  thumbnailUploadMiddleware,
} from '../controllers/courses.controller.js';

const router = Router();
const staffOnly = requireRole('admin', 'tutor');

router.get('/', authenticate, listCourses);
router.get('/:id', authenticate, getCourse);
router.post('/', authenticate, staffOnly, createCourse);
router.put('/:id', authenticate, staffOnly, updateCourse);
router.delete('/:id', authenticate, staffOnly, deleteCourse);
router.post('/:id/thumbnail', authenticate, staffOnly, thumbnailUploadMiddleware, uploadThumbnail);

export default router;
