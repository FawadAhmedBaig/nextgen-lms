import express from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { getCourseProgress, updateProgress } from '../controllers/enrollmentController.js';

const router = express.Router();

// --- 1. ENROLL IN A COURSE ---
router.post('/enroll/:courseId', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id; // From authMiddleware

    // 1. Check if course exists in the database
    const courseExists = await Course.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({ error: "Course not found" });
    }

    // 2. Check if enrollment already exists
    const existing = await Enrollment.findOne({ student: studentId, course: courseId });
    if (existing) {
      return res.status(400).json({ error: "Already enrolled in this course" });
    }

    // 3. Create the record in the Enrollment collection
    const newEnrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      progress: 0,
      isCompleted: false
    });

    // 🚀 --- NEW ACTIONS FOR THE "MOST ENROLLED" SYSTEM --- 🚀

    // 4. ATOMIC INCREMENT: Boost the course popularity count
    await Course.findByIdAndUpdate(courseId, { 
      $inc: { enrolledCount: 1 } 
    });

    // 5. USER UPDATE: Add course to the student's enrolled list for dashboard quick-access
    await User.findByIdAndUpdate(studentId, {
      $addToSet: { enrolledCourses: courseId }
    });

    // -------------------------------------------------------

    res.status(200).json({ 
      message: "Enrolled successfully", 
      enrollmentId: newEnrollment._id 
    });

  } catch (err) {
    console.error("Enrollment Error:", err.message);
    res.status(500).json({ error: "Internal Server Error during enrollment" });
  }
});

// --- 2. GET MY ENROLLED COURSES ---
router.get('/my-courses', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find all enrollments for this student
    const myEnrollments = await Enrollment.find({ student: studentId })
      .populate('course') 
      .sort({ createdAt: -1 });

    // Transform data to send a flat array of course objects back to the frontend
    const cleanedCourses = myEnrollments
      .filter(enroll => enroll.course !== null) // Safety check for deleted courses
      .map(enroll => {
        // Convert the Mongoose document to a plain JavaScript object
        const courseObj = enroll.course.toObject(); 
        
        return {
          ...courseObj,
          progress: enroll.progress,
          isCompleted: enroll.isCompleted,
          enrolledAt: enroll.createdAt,
          enrollmentId: enroll._id
        };
      });

    res.json(cleanedCourses);
  } catch (err) {
    console.error("Fetch Enrolled Courses Error:", err.message);
    res.status(500).json({ error: "Failed to fetch your courses. Please try again later." });
  }
});

// --- 3. CHECK ENROLLMENT STATUS ---
// Useful for the Course Details page to show "Start Learning" instead of "Enroll"
router.get('/check-status/:courseId', authMiddleware, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ 
      student: req.user.id, 
      course: req.params.courseId 
    });
    res.json({ isEnrolled: !!enrollment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/course-progress/:courseId', authMiddleware, getCourseProgress);
router.patch('/update-progress/:courseId', authMiddleware, updateProgress);

router.get('/public-resolve/:studentId/:courseId', async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // 1. Find the student by ID (only get the name)
    const student = await User.findById(studentId).select('name');
    
    // 2. Find the course by ID (only get the title)
    const course = await Course.findById(courseId).select('title');

    if (!student || !course) {
      return res.status(404).json({ message: "Student or Course record not found in database" });
    }

    res.json({
      studentName: student.name,
      courseTitle: course.title
    });
  } catch (error) {
    console.error("Resolve Error:", error);
    res.status(500).json({ error: "Internal Server Error during ID resolution" });
  }
});

export default router;