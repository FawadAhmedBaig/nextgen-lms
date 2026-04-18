import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  questions: [{
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true }, // 0 to 3
    explanation: { type: String } // Helpful for the AI Tutoring aspect
  }],
  passingScore: { type: Number, default: 70 }, // Percentage needed to pass
}, { timestamps: true });

export default mongoose.model('Quiz', quizSchema);