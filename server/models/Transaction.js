import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    amount: { type: Number, required: true }, // Total paid by student
    platformFee: { type: Number, required: true }, // Your 10% cut
    instructorNet: { type: Number, required: true }, // What instructor gets
    stripeSessionId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Transaction', TransactionSchema);