import express from 'express';
const router = express.Router();
import { 
  getNotifications, 
  markAsRead, 
  clearNotifications 
} from '../controllers/notificationController.js';
import authMiddleware from '../middleware/authMiddleware.js'; // Use your 'protect' middleware

// GET /api/notifications
router.get('/', authMiddleware, getNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, markAsRead);

// DELETE /api/notifications/clear
router.delete('/clear', authMiddleware, clearNotifications);

export default router;