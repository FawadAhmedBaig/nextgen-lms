import express from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Notification from '../models/Notification.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import { onlineUsers } from '../socketStore.js';

const router = express.Router();

router.get('/stats', protect, isAdmin, async (req, res) => {
  try {
    const users = await User.countDocuments();
    const courses = await Course.countDocuments();
    const instructors = await User.countDocuments({ role: 'instructor' });
    res.json({ users, courses, instructors });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});

router.get('/users', protect, isAdmin, async (req, res) => {
  const users = await User.find().select('-password_hash');
  res.json(users);
});

router.patch('/users/:id/status', protect, isAdmin, async (req, res) => {
  try {
    const { status } = req.body; 
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });

    // TRIGGER NOTIFICATION
    const io = req.app.get('socketio');
    const recipientSocket = onlineUsers.get(req.params.id);
    const notiData = {
      recipient: req.params.id,
      type: status === 'active' ? 'approval' : 'system',
      title: status === 'active' ? 'Account Active! ✅' : 'Account Restricted ⚠️',
      message: status === 'active' ? 'Your account has been approved by admin.' : 'Your access has been restricted.'
    };
    
    await Notification.create(notiData);
    if (recipientSocket) {
      io.to(recipientSocket).emit('notification_received', notiData);
    }

    res.json({ message: `User is now ${status}`, user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.delete('/courses/:id', protect, isAdmin, async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: "Course removed by admin" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete course" });
  }
});

export default router;