import express from 'express';
const router = express.Router();
import mongoose from 'mongoose';
import protect, { authorize } from '../middleware/authMiddleware.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Interaction from '../models/Interaction.js';

// @desc    Get real-time global stats for the instructor dashboard
// @route   GET /api/instructor/stats
router.get('/stats', protect, authorize('instructor'), async (req, res) => {
    try {
        // 1. Get ID from the token (ensure we use ObjectId for the query)
        const instructorId = new mongoose.Types.ObjectId(req.user._id || req.user.id);

        // 2. 🔥 FIXED: Find courses where 'instructor' matches the ID directly
        const myCourses = await Course.find({ instructor: instructorId }).select('_id price');
        const courseIds = myCourses.map(c => c._id);

        if (courseIds.length === 0) {
            return res.json({ 
                totalStudents: 0, 
                totalRevenue: "0.00", 
                totalCerts: 0, 
                totalAiQueries: 0 
            });
        }

        // 3. Fetch Enrollments
        const enrollments = await Enrollment.find({ course: { $in: courseIds } })
            .populate('course', 'price');

        // 4. Calculate Revenue
        const totalRevenue = enrollments.reduce((acc, curr) => {
            const rawPrice = curr.pricePaid || curr.course?.price || "0";
            const numericPrice = parseFloat(rawPrice.toString().replace(/[^\d.]/g, "")) || 0;
            return acc + numericPrice;
        }, 0);

        // 5. Calculate Stats
        const totalStudents = enrollments.length;
        const totalCerts = enrollments.filter(en => en.isCompleted).length;
        const totalAiQueries = await Interaction.countDocuments({ 
            courseId: { $in: courseIds } 
        });

        res.json({
            totalStudents,
            totalRevenue: totalRevenue.toFixed(2),
            totalCerts,
            totalAiQueries
        });

    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Get real-time student progress list
// @route   GET /api/instructor/student-progress
router.get('/student-progress', protect, authorize('instructor'), async (req, res) => {
    try {
        const instructorId = new mongoose.Types.ObjectId(req.user._id || req.user.id);

        // 1. 🔥 FIXED: Direct ID match
        const myCourses = await Course.find({ instructor: instructorId }).select('_id');
        
        if (!myCourses.length) {
            return res.json([]); 
        }

        const courseIds = myCourses.map(c => c._id);

        // 2. Find all enrollments
        const enrollments = await Enrollment.find({ course: { $in: courseIds } })
            .populate('student', 'name email')
            .populate('course', 'title')
            .sort({ updatedAt: -1 });

        // 3. Map for Frontend
        const progressData = enrollments.map(enrol => ({
            name: enrol.student?.name || "Unknown Student",
            email: enrol.student?.email || "N/A",
            courseTitle: enrol.course?.title || "Deleted Course",
            progress: enrol.progress || 0,
            isCompleted: enrol.isCompleted || false,
            completedCount: enrol.completedLessons?.length || 0
        }));

        res.json(progressData);
    } catch (err) {
        console.error("Progress Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;