import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ENV } from '../config/env.js';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ENV.ALLOWED_ORIGINS.includes(origin) || ENV.ALLOWED_ORIGINS.includes('*')) {
          return callback(null, true);
        }
        if (origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      // Client disconnected cleanly
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
}
