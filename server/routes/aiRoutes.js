import express from 'express';
import { askTutor } from '../controllers/aiController.js';
import authMiddleware  from '../middleware/authMiddleware.js';

const router = express.Router();

// The path here is just '/', because it's combined with '/api/ai' from server.js
router.post('/ask', authMiddleware, askTutor);

export default router;