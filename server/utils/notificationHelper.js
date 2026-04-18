// utils/notificationHelper.js
import Notification from '../models/Notification.js';
import { io, onlineUsers } from '../server.js';

export const sendNotification = async (recipientId, data) => {
  try {
    // 1. Save to Database
    const newNoti = await Notification.create({
      recipient: recipientId,
      ...data
    });

    // 2. If user is online, push via Socket.io
    const socketId = onlineUsers[recipientId];
    if (socketId) {
      io.to(socketId).emit('new_notification', newNoti);
    }
  } catch (err) {
    console.error("Notification Error:", err);
  }
};