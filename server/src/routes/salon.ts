import { Router, Request, Response } from 'express';
import { db } from '../config/db.js';

export const salonRouter = Router();

// GET /api/salon/status
salonRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const queueSetting = db.prepare("SELECT value FROM settings WHERE key = 'queue_open'").get() as { value: string } | undefined;
    const isQueueOpen = queueSetting ? queueSetting.value === 'true' : true;

    // Count waiting customers
    const waitingCountResult = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_duration), 0) as total_duration 
      FROM queue_tickets 
      WHERE status = 'Waiting'
    `).get() as { count: number; total_duration: number };

    // Count in-chair customers
    const inChairResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'In Chair'
    `).get() as { count: number };

    // Active barbers working (on duty and not on break)
    const workingBarbersResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM barbers 
      WHERE is_on_duty = 1 AND is_on_break = 0
    `).get() as { count: number };

    const workingBarbersCount = workingBarbersResult.count || 1;
    const totalDurationAhead = waitingCountResult.total_duration;

    // Formula: Total Duration of Services Ahead / Number of Barbers Working
    const estimatedWaitTime = Math.ceil(totalDurationAhead / workingBarbersCount);

    res.json({
      isOpen: isQueueOpen,
      waitingCount: waitingCountResult.count,
      inChairCount: inChairResult.count,
      workingBarbersCount,
      estimatedWaitTime: waitingCountResult.count === 0 ? 0 : Math.max(5, estimatedWaitTime),
      closingTime: '21:00'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/services
salonRouter.get('/services', (_req: Request, res: Response) => {
  try {
    const services = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY id ASC').all();
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/barbers
salonRouter.get('/barbers', (_req: Request, res: Response) => {
  try {
    const barbers = db.prepare('SELECT * FROM barbers ORDER BY chair ASC').all() as any[];

    // Calculate queue depth for each barber
    const enrichedBarbers = barbers.map((barber) => {
      const queueDepth = db.prepare(`
        SELECT COUNT(*) as count 
        FROM queue_tickets 
        WHERE status = 'Waiting' AND (preferred_barber = ? OR preferred_barber = 'any')
      `).get(barber.id) as { count: number };

      return {
        ...barber,
        queueDepth: queueDepth.count,
        status: barber.is_on_break === 1 ? 'break' : barber.is_on_duty === 1 ? 'available' : 'off'
      };
    });

    res.json(enrichedBarbers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
