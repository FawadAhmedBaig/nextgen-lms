import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  progress: { type: Number, default: 0 }, // Percentage (e.g., 50)
  
  // 🔥 CRITICAL: Store the indices of completed lessons
  completedLessons: { type: [Number], default: [] }, 
  
  isCompleted: { type: Boolean, default: false },
  enrolledAt: { type: Date, default: Date.now },
  blockchainData: {
    txnHash: { type: String, default: null },
    certHash: { type: String, default: null },
    issuedAt: { type: Date, default: null }
}
}, { timestamps: true });

export default mongoose.model('Enrollment', enrollmentSchema);