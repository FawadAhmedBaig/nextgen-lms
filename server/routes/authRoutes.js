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
import { validate, signupSchema, loginSchema, updateProfileSchema } from '../middleware/validateMiddleware.js';
import dns from 'dns/promises';
import sendMail from '../utils/sendMail.js';

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
router.post('/signup', validate(signupSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    // 1. --- RESILIENT DNS REALITY CHECK ---
    const domain = normalizedEmail.split('@')[1];
    let isDomainValid = false;

    try {
      // Step A: Attempt MX Record lookup with a 3-second timeout
      const mxRecords = await Promise.race([
        dns.resolveMx(domain),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      
      if (mxRecords && mxRecords.length > 0) isDomainValid = true;
    } catch (dnsErr) {
      // Step B: FALLBACK - If MX fails/timeouts, check for a basic A-Record (the website)
      // This ensures that even if Oracle blocks MX queries, valid domains still pass.
      try {
        await dns.lookup(domain);
        isDomainValid = true;
      } catch (lookupErr) {
        isDomainValid = false;
      }
    }

    if (!isDomainValid) {
      return res.status(400).json({ error: "The email domain provided is unreachable or invalid." });
    }

    // 2. Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ error: "User already exists with this email." });
    }

    // 3. Password Hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. OTP Generation
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // 5. Create "Pending" User
    const user = await User.create({ 
      name, 
      email: normalizedEmail, 
      password_hash: hashedPassword, 
      role: role || 'student',
      status: (role === 'instructor') ? 'pending' : 'active',
      isVerified: false,
      verificationCode: otp,
      verificationExpires: otpExpires
    });

    // 6. Send OTP via utility
    try {
      await sendMail({
        email: user.email,
        subject: "Verify your NextGen LMS Account",
        message: `Welcome to NextGen! Your verification code is: ${otp}`,
        html: `
          <div style="font-family: sans-serif; text-align: center; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb;">Confirm Your Email</h2>
            <p>Use the code below to finalize your registration:</p>
            <div style="background: #f1f5f9; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 12px;">Valid for 10 minutes.</p>
          </div>
        `
      });

      res.status(201).json({ 
        message: "Verification code sent to your email. Please verify to continue.",
        email: user.email 
      });

    } catch (mailErr) {
      console.error("Mail Delivery Failed:", mailErr);
      res.status(500).json({ error: "Account created but failed to send verification email." });
    }

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // 1. Find user and normalize email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Debugging Logs (Check your terminal)
    console.log("--- Verification Attempt ---");
    console.log("User Found:", !!user);
    if (user) {
      console.log("Stored Code:", user.verificationCode, "| Received Code:", code);
      console.log("Stored Type:", typeof user.verificationCode, "| Received Type:", typeof code);
      console.log("Is Expired:", user.verificationExpires < Date.now());
    }

    // 2. Validation with Type Casting
    // We use String() to ensure we aren't comparing a Number to a String
    if (
      !user || 
      String(user.verificationCode) !== String(code) || 
      user.verificationExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    // 3. Update User State
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    
    // Set status to active (Instructors remain 'pending' for admin approval)
    if (user.role === 'student') {
      user.status = 'active';
    }

    await user.save();
    
    res.json({ message: "Email verified successfully! You can now login." });

  } catch (err) {
    console.error("❌ Verification Route Error:", err);
    res.status(500).json({ message: "Internal server error during verification." });
  }
});

// --- LOGIN ---
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2. Verification Gatekeeper
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Your email is not verified. Please verify your account to log in.",
        needsVerification: true 
      });
    }

    // 3. Blocked Status Check
    if (user.status === 'blocked') {
      return res.status(403).json({ message: "Your account has been blocked by the Administrator." });
    }

    // 4. Instructor Approval Logic (The Shahzad/Saleem Fix)
    if (user.role === 'instructor') {
      // 💡 FLEXIBLE CHECK: Allow login if status is active OR isApproved is true.
      // This prevents instructors from getting stuck if the Admin only toggled one field.
      const isReady = user.status === 'active' || user.isApproved === true;
      
      if (!isReady) {
        return res.status(403).json({ 
          message: "Your instructor account is currently pending approval. Please check back later." 
        });
      }
    }

    // 5. Password Verification
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 6. Generate JWT Token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    // 7. Final Response
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture
      }
    });

  } catch (err) {
    console.error("❌ LOGIN ROUTE ERROR:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
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
      const isInstructor = userRole === 'instructor';
      
      user = new User({
        name: name || "Google User",
        email: email.toLowerCase(),
        profilePicture: avatar || "",
        role: userRole,
        status: isInstructor ? 'pending' : 'active',
        isApproved: isInstructor ? false : true,
        // 🔥 THE FIX: Mark Google users as verified immediately
        isVerified: true 
      });

      await user.save();
      console.log(`✅ New Google User Created: ${user.email} (Verified)`);
    } else {
      if (avatar && user.profilePicture !== avatar) {
        user.profilePicture = avatar;
        await user.save();
      }
      // 🔥 SYNC CHECK: If user exists but isVerified is false, update it now
      // This handles users created before the schema update.
      if (user.isVerified === false) {
        user.isVerified = true;
        await user.save();
      }
    }

    // 3. Status Gatekeeper
    if (user.status === 'blocked') {
      return res.status(403).json({ message: "This account has been blocked by administrator." });
    }

    // Instructor Approval Gatekeeper
    if (user.role === 'instructor') {
       const verifiedAndApproved = user.isApproved === true || user.status === 'active';
       
       if (!verifiedAndApproved) {
         return res.status(403).json({ 
           message: "Your instructor account is currently pending approval. Please check back later." 
         });
       }
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
        isVerified: user.isVerified, // Include in response
        profilePicture: user.profilePicture
      }
    });

  } catch (err) {
    console.error("❌ GOOGLE LOGIN BACKEND ERROR:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
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

// 1. Move upload.single to the front
// 2. Change key from 'image' to 'profilePicture'
router.put('/update-profile', 
  authMiddleware, 
  upload.single('profilePicture'), // Multer runs early to parse the stream
  validate(updateProfileSchema), 
  async (req, res) => {
    try {
      const { name, bio } = req.body; 
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // --- Logic: Only update if valid data is sent ---
      // This prevents saving the literal string "undefined" or "null"
      if (name && name.trim() !== "" && name !== "undefined" && name !== "null") {
        user.name = name.trim();
      }

      // Bio can be an empty string, but not the string "null"
      if (bio !== undefined && bio !== "null" && bio !== "undefined") {
        user.bio = bio.trim();
      } 
      
      // If a new file was successfully uploaded by Multer
      if (req.file) {
        user.profilePicture = req.file.path;
      }

      await user.save();

      res.json({
        message: "Profile updated successfully",
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
      console.error("🔥 Profile Update Server Error:", err);
      // Catching aborted requests or database conflicts
      res.status(500).json({ error: "Server failed to process update. Try a smaller image." });
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