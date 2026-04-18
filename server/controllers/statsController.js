// backend/controllers/statsController.js
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';

export const getPublicStats = async (req, res) => {
    try {
        const [studentCount, instructorCount, courseCount, enrollmentCount] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'instructor' }),
            Course.countDocuments(),
            Enrollment.countDocuments()
        ]);

        // Success rate can be calculated or set as a high target for FYP
        const successRate = 98; 

        res.json({
            students: studentCount,
            mentors: instructorCount,
            courses: courseCount,
            successRate
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats" });
    }
};