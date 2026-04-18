import Quiz from '../models/Quiz.js';
import Notification from '../models/Notification.js';
import Enrollment from '../models/Enrollment.js';
import { onlineUsers } from '../socketStore.js';

export const getQuizByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const quiz = await Quiz.findOne({ course: courseId });

    if (!quiz) {
      return res.status(404).json({ message: "No quiz found for this course." });
    }

    res.status(200).json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ message: "Server error fetching quiz" });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const { course, title, questions, passingScore } = req.body;
    
    await Quiz.deleteOne({ course });

    const newQuiz = new Quiz({
      course,
      title,
      questions,
      passingScore
    });

    await newQuiz.save();

    // NOTIFY ALL ENROLLED STUDENTS
    const enrollments = await Enrollment.find({ course }).select('student');
    const io = req.app.get('socketio');

    for (const enroll of enrollments) {
      const notiData = {
        recipient: enroll.student,
        type: 'quiz',
        title: 'New Quiz Live! 📝',
        message: `A new assessment has been added: ${title}`
      };
      await Notification.create(notiData);
      const socketId = onlineUsers.get(enroll.student.toString());
      if (socketId) {
        io.to(socketId).emit('notification_received', notiData);
      }
    }

    res.status(201).json(newQuiz);
  } catch (error) {
    res.status(500).json({ message: "Error saving quiz" });
  }
};