import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMe, updateProfile, uploadAvatar, avatarUploadMiddleware } from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/avatar', authenticate, avatarUploadMiddleware, uploadAvatar);

export default router;
