const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password').populate('department');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.name} (${socket.user.role})`);

    // Join user-specific room
    socket.join(`user_${socket.user._id}`);

    // Join role-specific room
    socket.join(`role_${socket.user.role}`);

    // Join department room if officer
    if (socket.user.role === 'Officer' && socket.user.department) {
      socket.join(`dept_${socket.user.department._id}`);
      console.log(`Officer joined department room: dept_${socket.user.department._id}`);
    }

    // Join admin room
    if (socket.user.role === 'Admin') {
      socket.join('admin_room');
    }

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
