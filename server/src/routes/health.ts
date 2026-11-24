import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/db.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = await checkDatabaseHealth();
  
  res.status(dbStatus.healthy ? 200 : 503).json({
    status: dbStatus.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus.healthy ? `connected (${dbStatus.type})` : 'disconnected',
    service: 'Salon Queue Management API'
  });
});
