// server/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // ⚡ Indexing for faster Navbar lookups
  },
  type: { 
    type: String, 
    enum: ['certificate', 'quiz', 'course', 'system', 'approval'], 
    default: 'system' 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // --- REDIRECTION FIELDS ---
  // Store the frontend route here (e.g., "/profile" or "/course-view/123")
  path: { 
    type: String, 
    default: null 
  },
  // Store the ID of the specific course or certificate if needed separately
  relatedId: { 
    type: mongoose.Schema.Types.ObjectId, 
    default: null 
  },
  
  isRead: { 
    type: Boolean, 
    default: false,
    index: true // ⚡ Indexing to quickly count unread notifications
  },
}, { timestamps: true });

// COMPOUND INDEX: Optimized for fetching unread notifications for a specific user
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;