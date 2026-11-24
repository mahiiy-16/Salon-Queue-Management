import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ENV } from '../config/env.js';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [ENV.CLIENT_URL, 'http://localhost:5173'],
      methods: ['GET', 'POST'],
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
