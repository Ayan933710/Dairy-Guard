import { io } from 'socket.io-client';
import { getToken, getApiUrls } from './apiClient.js';

export function getSocketUrl() {
  const configured = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configured) return configured;
  const urls = getApiUrls();
  if (urls.length > 0) {
    return urls[0].replace(/\/api\/?$/, '');
  }
  return 'http://localhost:5000';
}

let socket = null;
let currentSocketUrl = null;

export function getSocket() {
  const targetUrl = getSocketUrl();
  if (!socket || currentSocketUrl !== targetUrl) {
    if (socket) {
      try {
        socket.disconnect();
      } catch (_) {}
    }
    currentSocketUrl = targetUrl;
    socket = io(targetUrl, {
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
