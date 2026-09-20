/**
 * Socket.io wiring for real-time dashboard updates.
 *
 * The frontend (once wired up) should connect with:
 *   import { io } from 'socket.io-client';
 *   const socket = io(import.meta.env.VITE_API_URL, { auth: { token } });
 *
 * Events emitted server -> client:
 *   'telemetry:new'   - a raw sensor reading was just ingested
 *   'animal:updated'  - an animal's cached risk snapshot changed
 *   'alert:new'       - a new high-risk recommendation was generated
 *
 * Clients can optionally join a room per farm/owner so updates are
 * scoped to the herd they actually own (`socket.join('owner:<id>')`),
 * which is done automatically on connect based on the JWT.
 */
const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const env = require('../config/env');
const logger = require('../utils/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow anonymous connections for public features (e.g. landing page)
        return next();
      }
      const decoded = verifyToken(token);
      socket.user = decoded; // { sub, role, email }
      return next();
    } catch (err) {
      // Invalid/expired token → reject the connection
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

/** Broadcast to everyone, or scope to a specific herd owner's room if ownerId is given. */
function emitToOwner(ownerId, event, payload) {
  if (!io) return;
  if (ownerId) {
    io.to(`owner:${ownerId}`).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

module.exports = { initSocket, getIO, emitToOwner };
