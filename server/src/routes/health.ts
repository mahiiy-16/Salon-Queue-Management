import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/db.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const dbHealthy = checkDatabaseHealth();
  
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'connected (SQLite WAL)' : 'disconnected',
    service: 'Salon Queue Management API'
  });
});
