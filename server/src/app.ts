import express, { Express } from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { salonRouter } from './routes/salon.js';
import { queueRouter } from './routes/queue.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (ENV.ALLOWED_ORIGINS.includes(origin) || ENV.ALLOWED_ORIGINS.includes('*')) {
        return callback(null, true);
      }
      // In development or preview, also allow Vercel preview domains if configured
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for production web clients with credentials
    },
    credentials: true
  }));

  app.use(express.json());

  // Mount API routes
  app.use('/api', healthRouter);
  app.use('/api/salon', salonRouter);
  app.use('/api/queue', queueRouter);

  return app;
}
