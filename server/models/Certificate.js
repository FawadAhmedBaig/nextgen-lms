import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  issueDate: { type: Date, default: Date.now },
  
  // Blockchain Data
  transactionHash: { type: String, required: true, unique: true }, 
  certificateId: { type: String, required: true, unique: true }, // UUID or Blockchain ID
  ipfsLink: { type: String }, // Link to the digital certificate stored on IPFS
  
  verificationUrl: { type: String } // A public link to verify the certificate
}, { timestamps: true });

export default mongoose.model('Certificate', certificateSchema);