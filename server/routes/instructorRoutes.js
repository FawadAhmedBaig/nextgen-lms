import express from 'express';
const router = express.Router();
import mongoose from 'mongoose'; // Added to handle ObjectId conversion if needed
import protect, { authorize } from '../middleware/authMiddleware.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Interaction from '../models/Interaction.js';

// @desc    Get real-time global stats for the instructor dashboard
// @route   GET /api/instructor/stats
router.get('/stats', protect, authorize('instructor'), async (req, res) => {
    try {
        const instructorId = req.user.id;

        // 1. Get all course IDs owned by this instructor
        const myCourses = await Course.find({ "instructor._id": instructorId }).select('_id price');
        const courseIds = myCourses.map(c => c._id);

        if (courseIds.length === 0) {
            return res.json({ 
                totalStudents: 0, 
                totalRevenue: "0.00", 
                totalCerts: 0, 
                totalAiQueries: 0 
            });
        }

        // 2. Fetch Enrollments and Populate Course to calculate revenue
        const enrollments = await Enrollment.find({ course: { $in: courseIds } })
            .populate('course', 'price');

        // 3. Calculate Revenue (Cleaning strings like "$99.00" or "Free")
        const totalRevenue = enrollments.reduce((acc, curr) => {
            const rawPrice = curr.pricePaid || curr.course?.price || "0";
            const numericPrice = parseFloat(rawPrice.toString().replace(/[^\d.]/g, "")) || 0;
            return acc + numericPrice;
        }, 0);

        // 4. Calculate Student & Cert Stats
        const totalStudents = enrollments.length;
        const totalCerts = enrollments.filter(en => en.isCompleted).length;

        // 5. 🔥 AI QUERIES: Count real records from the Interaction model
        const totalAiQueries = await Interaction.countDocuments({ 
            courseId: { $in: courseIds } 
        });

        // 6. Final Response
        res.json({
            totalStudents,
            totalRevenue: totalRevenue.toFixed(2),
            totalCerts,
            totalAiQueries
        });

    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: "Server Error while fetching stats" });
    }
});
// @desc    Get real-time student progress list
// @route   GET /api/instructor/student-progress
router.get('/student-progress', protect, authorize('instructor'), async (req, res) => {
    try {
        const instructorId = req.user.id;

        // 1. 🔥 FIXED: Search using dot notation for nested instructor._id
        const myCourses = await Course.find({ 
            "instructor._id": instructorId 
        }).select('_id'); // We only need the IDs
        
        if (!myCourses.length) {
            return res.json([]); // Return early if instructor has no courses
        }

        const courseIds = myCourses.map(c => c._id);

        // 2. Find all enrollments linked to those course IDs
        const enrollments = await Enrollment.find({ course: { $in: courseIds } })
            .populate('student', 'name email')
            .populate('course', 'title')
            .sort({ updatedAt: -1 });

        // 3. Map to match your Frontend Table keys
        const progressData = enrollments.map(enrol => ({
            name: enrol.student?.name || "Unknown Student",
            email: enrol.student?.email || "N/A",
            courseTitle: enrol.course?.title || "Deleted Course",
            // Use logical fallbacks to ensure progress shows up correctly
            progress: enrol.progress || (enrol.completionPercentage) || 0,
            isCompleted: enrol.isCompleted || false,
            completedCount: enrol.completedLessons?.length || 0
        }));

        res.json(progressData);
    } catch (err) {
        console.error("Progress Error:", err);
        res.status(500).json({ message: "Server Error while fetching student progress" });
    }
});

export default router;