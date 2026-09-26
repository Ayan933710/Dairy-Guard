const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const env = require('../config/env');
const logger = require('../utils/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next();
      }
      const decoded = verifyToken(token);
      socket.user = decoded; // { sub, role, email }
      return next();
    } catch (err) {
      return next(new Error('Authentication failed: invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user?.sub) {
      socket.join(`owner:${socket.user.sub}`);
    }
    logger.info(`[socket] client connected: ${socket.id}${socket.user ? ` (user ${socket.user.sub})` : ''}`);

    socket.on('disconnect', () => {
      logger.info(`[socket] client disconnected: ${socket.id}`);
    });
  });

  logger.info('[socket] Socket.io server initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized yet - call initSocket(httpServer) first.');
  return io;
}

function emitToOwner(ownerId, event, payload) {
  if (!io) return;
  if (ownerId) {
    io.to(`owner:${ownerId}`).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

module.exports = { initSocket, getIO, emitToOwner };
