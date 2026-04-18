import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http'; // Required for Socket.io
import { Server } from 'socket.io'; // Required for Socket.io
import aiRoutes from './routes/aiRoutes.js';
// Import the shared store
import { onlineUsers } from './socketStore.js'; 

// Import your routes using ES Modules
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js'; 
import instructorRoutes from './routes/instructorRoutes.js';


dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server

// Initialize Socket.io
// Initialize Socket.io with production-ready CORS
const io = new Server(server, {
  cors: {
    // Allows both local development and your new OCI domain
    origin: ["http://localhost:5173", "http://nextgen-lms-fawad.duckdns.org"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://nextgen-lms-fawad.duckdns.org"],
  credentials: true
}));
app.use(express.json());
app.use(express.json());

// --- SOCKET.IO REAL-TIME LOGIC ---
io.on('connection', (socket) => {
  console.log('⚡ New Connection:', socket.id);

  socket.on('register_user', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} is now online and ready for alerts.`);
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    console.log('❌ User disconnected');
  });
});

// Export io to be used in routes/controllers
app.set('socketio', io);

// Database Connection
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ MongoDB Connected: NextGen Database Ready"))
//   .catch(err => console.log("❌ Connection Error:", err));
// Database Connection & Server Startup
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, 
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log("✅ MongoDB Connected: NextGen Database Ready");
  // Use server.listen here so Socket.io works!
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`🚀 Production Server running on port ${PORT}`));
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err);
  process.exit(1); // Stop the container if DB fails
});

//   mongoose.connect(process.env.MONGO_URI, {
//   serverSelectionTimeoutMS: 5000, // Wait 5 seconds before failing
//   socketTimeoutMS: 45000,         // Close sockets after 45 seconds of inactivity
// }).then(() => console.log("✅ MongoDB Connected: NextGen Database Ready"))
//   .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/notifications', notificationRoutes); 
app.use('/api/ai', aiRoutes);
app.use('/api/instructor', instructorRoutes);
