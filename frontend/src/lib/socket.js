/**
 * Singleton Socket.io client connecting to the DairyGuard backend for
 * real-time dashboard updates ('telemetry:new', 'animal:updated',
 * 'alert:new'). Connects lazily and re-authenticates whenever the
 * stored JWT changes (e.g. after login/logout).
 */
import { io } from 'socket.io-client';
import { getToken } from './apiClient.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: (cb) => cb({ token: getToken() }),
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) socket.disconnect();
}
