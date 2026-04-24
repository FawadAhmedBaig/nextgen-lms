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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});



// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://nextgen-lms.duckdns.org", "https://nextgen-lms.duckdns.org"],
  credentials: true
}));
app.use(express.json());
app.use(helmet());
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
app.use('/api/', apiLimiter);
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