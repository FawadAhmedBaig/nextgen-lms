import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Interaction = mongoose.models.Interaction || mongoose.model('Interaction', interactionSchema);
export default Interaction;