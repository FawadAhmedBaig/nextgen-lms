import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import Course from '../models/Course.js'; // 🔥 MUST IMPORT COURSE MODEL
import User from '../models/User.js';     // 🔥 MUST IMPORT USER MODEL
import { onlineUsers } from '../socketStore.js';

// --- NEW FUNCTION: The actual enrollment trigger ---
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id || req.user._id;

    // 1. Prevent duplicate enrollment
    const existing = await Enrollment.findOne({ student: userId, course: courseId });
    if (existing) return res.status(400).json({ message: "Already enrolled" });

    // 2. Create Enrollment Record
    const enrollment = new Enrollment({
      student: userId,
      course: courseId,
      progress: 0
    });
    await enrollment.save();

    // 3. 🔥 THE CRITICAL SYNC: Increment the Course Enrollment Count
    await Course.findByIdAndUpdate(courseId, { 
      $inc: { enrolledCount: 1 } 
    });

    // 4. Update User's enrolledCourses array for Dashboard quick-access
    await User.findByIdAndUpdate(userId, {
      $addToSet: { enrolledCourses: courseId }
    });

    res.status(201).json({ message: "Successfully enrolled", enrollment });
  } catch (error) {
    console.error("Enrollment Error:", error);
    res.status(500).json({ message: "Enrollment failed" });
  }
};

// --- EXISTING: Fetching Progress ---
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id || req.user._id; 

    const enrollment = await Enrollment.findOne({ 
      student: userId, 
      course: courseId 
    });
    
    if (!enrollment) {
      return res.status(200).json({ 
        progress: 0, 
        completedLessons: [], 
        isCompleted: false 
      });
    }

    res.status(200).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching progress" });
  }
};

// --- EXISTING: Updating Progress ---
export const updateProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { completedLessons, progress, isCompleted } = req.body;
    const userId = req.user.id || req.user._id;

    const enrollment = await Enrollment.findOneAndUpdate(
      { student: userId, course: courseId },
      { 
        $set: { 
          ...(completedLessons !== undefined && { completedLessons }),
          ...(progress !== undefined && { progress }),
          ...(isCompleted !== undefined && { isCompleted })
        } 
      },
      { new: true, runValidators: true }
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment record not found." });
    }

    // TRIGGER NOTIFICATION ON COURSE COMPLETION
    if (isCompleted === true) {
      const io = req.app.get('socketio');
      const recipientSocket = onlineUsers.get(userId);
      const notiData = {
        recipient: userId,
        type: 'course',
        title: 'Course Completed! 🏆',
        message: `Incredible work! You have finished all modules.`
      };
      await Notification.create(notiData);
      if (recipientSocket) {
        io.to(recipientSocket).emit('notification_received', notiData);
      }
    }

    res.status(200).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: "Error saving progress" });
  }
};