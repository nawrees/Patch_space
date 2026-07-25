import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { getSiteSettings, updateSiteSettings } from '../controllers/settings.controller.js';

const router = Router();

router.get('/site-settings', getSiteSettings); // public — no authenticate middleware
router.patch('/site-settings', authenticate, requireRole('admin'), updateSiteSettings);

export default router;
