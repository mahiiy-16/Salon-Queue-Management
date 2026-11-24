import http from 'http';
import { createApp } from './app.js';
import { initSocketIO } from './sockets/socket.js';
import { ENV } from './config/env.js';

const app = createApp();
const httpServer = http.createServer(app);

// Initialize Socket.IO with HTTP server
initSocketIO(httpServer);

httpServer.listen(ENV.PORT, () => {
  console.log(`[Salon Queue Server] Running on http://localhost:${ENV.PORT}`);
  console.log(`[Salon Queue Server] Health check available at http://localhost:${ENV.PORT}/api/health`);
});
