import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMe, updateProfile } from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
