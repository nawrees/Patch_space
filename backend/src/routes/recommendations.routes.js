import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getRecommendations } from '../controllers/recommendations.controller.js';

const router = Router();

router.get('/', authenticate, getRecommendations);

export default router;
