import express from 'express';
import { getQuizByCourse, createQuiz } from '../controllers/quizController.js';

const router = express.Router();

// This matches the frontend call: axios.get('.../api/quizzes/course/${id}')
router.get('/course/:courseId', getQuizByCourse);
router.post('/create', createQuiz);

export default router;