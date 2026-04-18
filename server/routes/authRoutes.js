import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; 
import User from '../models/User.js';
import authMiddleware, { isAdmin } from '../middleware/authMiddleware.js'; // Import isAdmin
import upload from '../middleware/upload.js';
import Enrollment from '../models/Enrollment.js';

dotenv.config(); 

const router = express.Router();

// --- NODEMAILER CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS 
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Nodemailer Verification Failed:", error.message);
  } else {
    console.log("🚀 Email Server is ready to send messages");
  }
});

// --- SIGNUP ---
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await User.create({ 
      name, 
      email, 
      password_hash: hashedPassword, 
      role: role || 'student'
    });

    res.status(201).json({ 
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if account is blocked by admin
    if (user.status === 'blocked') {
        return res.status(403).json({ message: "Your account has been blocked by the Administrator." });
    }

    // Inside router.post('/login', ...)
    if (user.role === 'instructor' && user.status === 'pending') {
        return res.status(403).json({ message: "Account pending admin approval." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FORGOT PASSWORD ---
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save();

    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER, 
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <a href="${resetURL}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset My Password</a>
          <p style="margin-top: 20px; color: #777;">This link expires in 1 hour.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Reset link sent to email." });

  } catch (err) {
    console.error("🔴 Forget Password Error:", err); 
    res.status(500).json({ error: "Failed to send email. Check server logs." });
  }
});

// --- RESET PASSWORD ---
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/google-login', async (req, res) => {
  try {
    const { email, name, avatar, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required from Google." });
    }

    // 1. Search for user (Case-insensitive)
    let user = await User.findOne({ email: email.toLowerCase() });

    // 2. If user doesn't exist, create them
    if (!user) {
      const userRole = role || 'student';
      // Instructors start as 'pending', Students as 'active'
      const initialStatus = (userRole === 'instructor') ? 'pending' : 'active';

      user = new User({
        name: name || "Google User",
        email: email.toLowerCase(),
        profilePicture: avatar || "",
        role: userRole,
        status: initialStatus,
        // We DO NOT set password_hash or studentId here. 
        // Mongoose will leave them as undefined/null safely.
      });

      await user.save();
      console.log(`✅ New Google User Created: ${user.email} as ${user.role}`);
    }

    // 3. Status Gatekeeper
    if (user.status === 'blocked') {
      return res.status(403).json({ message: "This account has been blocked by administrator." });
    }

    if (user.role === 'instructor' && user.status === 'pending') {
      return res.status(403).json({ 
        message: "Your instructor account is pending admin approval. Please wait for verification." 
      });
    }

    // 4. Generate Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 5. Success Response
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePicture: user.profilePicture
      }
    });

  } catch (err) {
    console.error("❌ GOOGLE LOGIN BACKEND ERROR:", err);
    
    // Check for common Duplicate Key Error (E11000)
    if (err.code === 11000) {
      return res.status(500).json({ 
        error: "Database Conflict", 
        message: "A database index conflict occurred (likely studentId). Please clear your users collection." 
      });
    }

    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err.message 
    });
  }
});
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put('/update-profile', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, bio } = req.body; 
    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (bio) user.bio = bio; 
    if (req.file) user.profilePicture = req.file.path;

    await user.save();

    res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio, 
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NEW: ADMIN PANEL ROUTES (FR-11) ---

// 1. Get stats and list of all users
router.get('/admin/users', authMiddleware, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password_hash');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Update user status (Block/Unblock)
router.patch('/admin/users/:id/status', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { status } = req.body; // Expecting 'active' or 'blocked'
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.status = status;
        await user.save();
        res.json({ message: `User status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Dashboard Summary Stats
router.get('/admin/stats', authMiddleware, isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const instructors = await User.countDocuments({ role: 'instructor' });
        const students = await User.countDocuments({ role: 'student' });
        
        res.json({ totalUsers, instructors, students });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- APPROVE INSTRUCTOR ---
router.patch('/admin/users/:id/approve', authMiddleware, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { status: 'active' });
        res.json({ message: "Instructor Approved Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GET CERTIFICATE REGISTRY ---
// Assuming you have an Enrollment or Certificate model
// --- GET CERTIFICATE REGISTRY (Updated for Stability) ---
router.get('/admin/certificates', authMiddleware, isAdmin, async (req, res) => {
    try {
        // We look for enrollments where progress is 100 or isCompleted is true
        // Ensure 'Enrollment' model is imported at the top of authRoutes.js
        const completed = await Enrollment.find({ 
            $or: [ { isCompleted: true }, { progress: 100 } ] 
        })
        .populate('student', 'name email') // Points to User model
        .populate('course', 'title');      // Points to Course model

        // If no certificates found, return empty array instead of null/error
        res.json(completed || []);
    } catch (err) {
        console.error("❌ Admin Certificate Route Error:", err);
        res.status(500).json({ error: "Failed to fetch certificates. Check if Enrollment model is defined." });
    }
});


export default router;