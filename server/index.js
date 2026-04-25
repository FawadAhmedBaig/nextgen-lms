import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import aiRoutes from './routes/aiRoutes.js';
import { onlineUsers } from './socketStore.js'; 
import rateLimit from 'express-rate-limit';


// Import your routes
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js'; // ✅ ADDED THIS
import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js'; 
import instructorRoutes from './routes/instructorRoutes.js';
import helmet from 'helmet';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Initialize Socket.io with production-ready CORS
const io = new Server(server, {
  cors: {
    // 💡 Tip: Add HTTPS version of your duckdns domain
    origin: ["http://localhost:5173", "http://nextgen-lms.duckdns.org", "https://nextgen-lms.duckdns.org"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    status: 429,
    error: "High traffic detected.",
    message: "Slow down slightly. Try again in a few minutes."
  },
  
  // 🔥 THE FIX: Remove the manual keyGenerator and use 'trust proxy'
  // Instead of manually writing a keyGenerator, we tell Express to trust 
  // the headers from Nginx/Oracle and let the library handle the IP.
  
  standardHeaders: true,
  legacyHeaders: false,
  
  // If you are using a custom skip function, keep it here:
  skip: (req) => {
    return req.ip === '127.0.0.1' || req.ip === '::1';
  },

  // 🛡️ SECURITY ADDITION:
  // This tells the library how to handle the validation check.
  validate: { xForwardedForHeader: false }, 
});

// --- ROUTE-SPECIFIC TIERS (Best Practice) ---

// 1. Strict Limiter for sensitive Auth routes (Prevents Brute Force)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Hour window
  max: 20, // Only 20 login/signup attempts per hour
  message: { error: "Too many login attempts. Please try again in an hour." }
});

export { apiLimiter, authLimiter };

app.use(express.json());
// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://nextgen-lms.duckdns.org", "https://nextgen-lms.duckdns.org"],
  credentials: true
}));
app.use((req, res, next) => {
  // This allows the Google Popup to talk back to your website
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp"); // Optional but helpful
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Set to false for dev to allow all sources, or configure strictly
}));
// --- UPDATED SOCKET.IO LOGIC ---
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('🔌 New connection:', socket.id);

  socket.on('register_user', (userId) => {
    if (userId) {
      // 1. Join a private room unique to this user
      socket.join(userId.toString());
      
      // 2. Keep the Map updated (optional, but good for tracking count)
      onlineUsers.set(userId.toString(), socket.id);
      
      console.log(`✅ User ${userId} is now in their private notification room.`);
    }
  });

  socket.on('disconnect', () => {
    // Cleanup the Map
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`❌ User ${userId} disconnected.`);
        break;
      }
    }
  });
});

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, 
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log("✅ MongoDB Connected");
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch(err => {
  console.error("❌ DB Error:", err);
  process.exit(1);
});

// Routes
// app.use('/api/', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes); // ✅ FIXED: Registered Enrollment Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/certificate', certificateRoutes); // ✅ FIXED: Changed to plural to match frontend
app.use('/api/quizzes', quizRoutes);
app.use('/api/notifications', notificationRoutes); 
app.use('/api/ai', aiRoutes);
app.use('/api/instructor', instructorRoutes);

// server.js
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  res.status(500).json({ 
    error: "Server Crash!", 
    details: err.message // This will send the real error to your browser console
  });
});

