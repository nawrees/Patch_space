import { Router } from 'express';
import authRoutes from './auth.routes.js';
import courseRoutes from './courses.routes.js';
import contentRoutes from './content.routes.js';
import resourceRoutes from './resources.routes.js';
import enrollmentRoutes from './enrollments.routes.js';
import progressRoutes from './progress.routes.js';
import tutorRoutes from './tutors.routes.js';
import adminRoutes from './admin.routes.js';
import analyticsRoutes from './analytics.routes.js';
import recommendationsRoutes from './recommendations.routes.js';
import questionsRoutes from './questions.routes.js';
import labsRoutes from './labs.routes.js';
import savedRoutes from './saved.routes.js';
import streaksRoutes from './streaks.routes.js';
import notificationsRoutes from './notifications.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/', contentRoutes);         // /courses/:id/modules, /modules/:id, /lessons/:id, /lessons/:id/lab
router.use('/', resourceRoutes);        // /lessons/:id/resources, /resources/:id
router.use('/', enrollmentRoutes);      // /courses/:id/enroll, /enrollments
router.use('/progress', progressRoutes);
router.use('/tutors', tutorRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/', questionsRoutes);       // /lessons/:id/questions, /questions, /questions/:id/answer
router.use('/', labsRoutes);            // /labs/:id/session, /labs/:id/start, /labs/:id/submit, /labs/:id/logs
router.use('/', savedRoutes);           // /saved, /saved/:courseId
router.use('/', streaksRoutes);         // /streaks
router.use('/', notificationsRoutes);   // /notifications
router.use('/', settingsRoutes);        // /site-settings

export default router;
