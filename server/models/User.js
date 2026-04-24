import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  
  // Required: false allows Google Login to skip password
  password_hash: { 
    type: String, 
    required: false 
  },
  
  profilePicture: { 
    type: String, 
    default: "" 
  },

  // sparse: true is CRITICAL. It allows multiple users to have 'null' studentId
  studentId: { 
    type: String, 
    unique: true, 
    sparse: true, 
    default: null 
  }, 

  bio: { 
    type: String, 
    default: "Computer Science student focusing on Blockchain and AI." 
  },
  
  enrolledCourses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }
  ],

  role: { 
    type: String, 
    enum: ['student', 'instructor', 'admin'], 
    default: 'student' 
  },

  status: { 
    type: String, 
    enum: ['active', 'blocked', 'pending'], 
    default: 'active' 
  },

  // --- 🔥 NEW: EMAIL VERIFICATION FIELDS ---
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationCode: { 
    type: String 
  },
  verificationExpires: { 
    type: Date 
  },
  
  // --- EXISTING RESET LOGIC ---
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;