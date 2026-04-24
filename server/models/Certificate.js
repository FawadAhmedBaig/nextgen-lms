import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  
  // Blockchain Data
  // 🔥 Added sparse: true to handle potential duplicates of null during retries
  transactionHash: { 
    type: String, 
    required: true, 
    unique: true,
    sparse: true 
  }, 
  
  // The unique cert identifier (IPFS hash or similar)
  certificateHash: { 
    type: String, 
    required: true 
  }, 

}, { timestamps: true });

// Prevent model overwrite error in development
const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

export default Certificate;