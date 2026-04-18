import express from 'express';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Find notifications where recipient matches the logged-in user ID
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 }) // Newest first
      .limit(20);
      
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching notifications" });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a specific notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// @route   DELETE /api/notifications/clear
// @desc    Clear all notifications for a user
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    res.json({ message: "Notifications cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;