import express from 'express';
const router = express.Router();
import { 
  enrollInCourse, 
  getCourseProgress, 
  updateProgress, 
  getMyEnrollments 
} from '../controllers/enrollmentController.js';
import authMiddleware from '../middleware/authMiddleware.js';

// Get current student's enrollments (This stops the 404 on Profile.jsx)
router.get('/my-enrollments', authMiddleware, getMyEnrollments);

// Other enrollment actions
router.post('/enroll/:courseId', authMiddleware, enrollInCourse);
router.get('/progress/:courseId', authMiddleware, getCourseProgress);
router.patch('/progress/:courseId', authMiddleware, updateProgress);

export default router;