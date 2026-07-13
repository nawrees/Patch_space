import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { askQuestion, getLessonQuestions, getAllQuestions, answerQuestion } from '../controllers/questions.controller.js';

const router = Router();

// Student: ask / list questions for a lesson
router.post('/lessons/:lessonId/questions', authenticate, askQuestion);
router.get('/lessons/:lessonId/questions', authenticate, getLessonQuestions);

// Tutor/Admin: all questions feed + answer
router.get('/questions', authenticate, requireRole('admin', 'tutor'), getAllQuestions);
router.put('/questions/:id/answer', authenticate, requireRole('admin', 'tutor'), answerQuestion);

export default router;
