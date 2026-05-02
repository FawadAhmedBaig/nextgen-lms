import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route Imports
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js'; 
import instructorRoutes from './routes/instructorRoutes.js';

import { onlineUsers } from './socketStore.js'; 

dotenv.config();

const app = express();

// --- 1. WEBHOOK (Must be BEFORE express.json) ---
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes);

app.set('trust proxy', 1);
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://nextgen-lms.duckdns.org", "https://nextgen-lms.duckdns.org"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
  validate: { xForwardedForHeader: false }, 
});

// --- 2. MIDDLEWARE ---
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://nextgen-lms.duckdns.org", "https://nextgen-lms.duckdns.org"],
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.set('socketio', io);

// Socket Logic
io.on('connection', (socket) => {
  socket.on('register_user', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      onlineUsers.set(userId.toString(), socket.id);
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("❌ DB Error:", err);
    process.exit(1);
  });

// --- 3. ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes); // 👈 Profile route should be INSIDE this file
app.use('/api/certificate', certificateRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/notifications', notificationRoutes); 
app.use('/api/ai', aiRoutes);
app.use('/api/instructor', instructorRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  res.status(500).json({ error: "Server Error", details: err.message });
});