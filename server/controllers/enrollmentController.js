import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import Course from '../models/Course.js'; 
import User from '../models/User.js';     
import { onlineUsers } from '../socketStore.js';

// --- NEW FUNCTION: Fetch all enrollments for the logged-in student ---
// This fixes the 404 error on the Profile page
export const getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // We find all enrollments for this student and 'populate' the course details
    const enrollments = await Enrollment.find({ student: userId })
      .populate('course', 'title imageUrl category instructor')
      .sort({ createdAt: -1 });

    res.status(200).json(enrollments);
  } catch (error) {
    console.error("Error fetching my enrollments:", error);
    res.status(500).json({ message: "Failed to fetch enrollments" });
  }
};

// --- EXISTING: The actual enrollment trigger ---
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id || req.user._id;

    const existing = await Enrollment.findOne({ student: userId, course: courseId });
    if (existing) return res.status(400).json({ message: "Already enrolled" });

    const enrollment = new Enrollment({
      student: userId,
      course: courseId,
      progress: 0
    });
    await enrollment.save();

    await Course.findByIdAndUpdate(courseId, { 
      $inc: { enrolledCount: 1 } 
    });

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

    // 1. Update the record
    const enrollment = await Enrollment.findOneAndUpdate(
      { student: userId, course: courseId },
      { 
        $set: { 
          ...(completedLessons !== undefined && { completedLessons }),
          ...(progress !== undefined && { progress }),
          ...(isCompleted !== undefined && { isCompleted })
        } 
      },
      { new: true }
    );

    if (!enrollment) return res.status(404).json({ message: "Enrollment not found." });

    // 2. 🔥 THE FIX: Explicitly check the 'isCompleted' from req.body
if (isCompleted === true) {
      const io = req.app.get('socketio');
      
      const notiData = {
        recipient: userId,
        type: 'certificate',
        title: 'Course Completed! 🏆',
        message: `Incredible work! You have finished all modules.`,
        path: `/course-view/${courseId}?tab=certificates` 
      };

      await Notification.create(notiData);

      // 🔥 ROOM-BASED EMIT: This is much more reliable than direct socket IDs
      // It sends the message to every tab/socket that joined the 'userId' room
      io.to(userId.toString()).emit('notification_received', notiData);
      
      console.log(`📢 Real-time notification sent to room: ${userId}`);
    }

    res.status(200).json(enrollment);
  } catch (error) {
    console.error("Progress Update Error:", error);
    res.status(500).json({ message: "Error saving progress" });
  }
};