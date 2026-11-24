import express, { Express } from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { salonRouter } from './routes/salon.js';
import { queueRouter } from './routes/queue.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:5173'],
    credentials: true
  }));

  app.use(express.json());

  // Mount API routes
  app.use('/api', healthRouter);
  app.use('/api/salon', salonRouter);
  app.use('/api/queue', queueRouter);

  return app;
}
