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

// GET /api/salon/services/all (All services including disabled, for Admin)
salonRouter.get('/services/all', (_req: Request, res: Response) => {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY id ASC').all();
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/salon/services (Add new service)
salonRouter.post('/services', async (req: Request, res: Response) => {
  try {
    const { name_en, name_gu, duration, price, description_en, description_gu, is_active } = req.body;

    if (!name_en || name_en.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid English service name (at least 2 characters).' });
      return;
    }
    if (!name_gu || name_gu.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid Gujarati service name.' });
      return;
    }
    const numDuration = parseInt(duration, 10);
    const numPrice = parseFloat(price);

    if (isNaN(numDuration) || numDuration <= 0) {
      res.status(400).json({ error: 'Duration must be a positive number of minutes.' });
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      res.status(400).json({ error: 'Price must be a valid non-negative number.' });
      return;
    }

    const insertStmt = db.prepare(`
      INSERT INTO services (name_en, name_gu, duration, price, description_en, description_gu, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      name_en.trim(),
      name_gu.trim(),
      numDuration,
      numPrice,
      (description_en || '').trim(),
      (description_gu || '').trim(),
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    const created = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'SERVICES_UPDATED' });
    } catch {}

    res.status(201).json({ success: true, service: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/salon/services/:id (Update service)
salonRouter.put('/services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name_en, name_gu, duration, price, description_en, description_gu, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    const numDuration = parseInt(duration, 10);
    const numPrice = parseFloat(price);

    if (isNaN(numDuration) || numDuration <= 0) {
      res.status(400).json({ error: 'Duration must be a positive number.' });
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      res.status(400).json({ error: 'Price must be non-negative.' });
      return;
    }

    db.prepare(`
      UPDATE services 
      SET name_en = ?, name_gu = ?, duration = ?, price = ?, 
          description_en = ?, description_gu = ?, is_active = ?
      WHERE id = ?
    `).run(
      name_en.trim(),
      name_gu.trim(),
      numDuration,
      numPrice,
      (description_en || '').trim(),
      (description_gu || '').trim(),
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      id
    );

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'SERVICES_UPDATED' });
    } catch {}

    res.json({ success: true, service: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/salon/services/:id
salonRouter.delete('/services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM services WHERE id = ?').run(id);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'SERVICES_UPDATED' });
    } catch {}

    res.json({ success: true, message: 'Service deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/salon/barbers (Add new barber)
salonRouter.post('/barbers', async (req: Request, res: Response) => {
  try {
    const { name, chair, specialization, is_on_duty, is_on_break } = req.body;

    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid barber name (at least 2 characters).' });
      return;
    }
    if (!chair || chair.trim().length < 2) {
      res.status(400).json({ error: 'Please enter an assigned chair/station.' });
      return;
    }

    // Generate unique ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const existing = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);
    if (existing) {
      res.status(400).json({ error: `Barber with ID '${id}' already exists.` });
      return;
    }

    db.prepare(`
      INSERT INTO barbers (id, name, chair, specialization, is_on_duty, is_on_break)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      chair.trim(),
      (specialization || 'Master Stylist').trim(),
      is_on_duty !== undefined ? (is_on_duty ? 1 : 0) : 1,
      is_on_break !== undefined ? (is_on_break ? 1 : 0) : 0
    );

    const created = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'BARBER_ROSTER_UPDATED' });
    } catch {}

    res.status(201).json({ success: true, barber: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/salon/barbers/:id (Edit barber details)
salonRouter.put('/barbers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, chair, specialization, is_on_duty, is_on_break } = req.body;

    const existing = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    db.prepare(`
      UPDATE barbers 
      SET name = ?, chair = ?, specialization = ?, is_on_duty = ?, is_on_break = ?
      WHERE id = ?
    `).run(
      name.trim(),
      chair.trim(),
      (specialization || 'Master Stylist').trim(),
      is_on_duty !== undefined ? (is_on_duty ? 1 : 0) : 1,
      is_on_break !== undefined ? (is_on_break ? 1 : 0) : 0,
      id
    );

    const updated = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'BARBER_ROSTER_UPDATED' });
    } catch {}

    res.json({ success: true, barber: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/salon/barbers/:id
salonRouter.delete('/barbers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM barbers WHERE id = ?').run(id);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'BARBER_ROSTER_UPDATED' });
    } catch {}

    res.json({ success: true, message: 'Barber removed.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/salon/settings/queue_open (Toggle master online queue switch)
salonRouter.put('/settings/queue_open', async (req: Request, res: Response) => {
  try {
    const { isOpen } = req.body;
    const valStr = isOpen === true || isOpen === 'true' ? 'true' : 'false';

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('queue_open', ?)").run(valStr);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'QUEUE_STATUS_TOGGLED', isOpen: valStr === 'true' });
    } catch {}

    res.json({ success: true, isOpen: valStr === 'true' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/salon/metrics (Owner daily performance statistics)
salonRouter.get('/metrics', (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total served today
    const servedCountResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'Done' AND DATE(created_at) = DATE(?)
    `).get(today) as { count: number };

    // Total no-shows today
    const noShowResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'No-show' AND DATE(created_at) = DATE(?)
    `).get(today) as { count: number };

    // Active queue depth
    const waitingResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'Waiting'
    `).get() as { count: number };

    // Average duration of services
    const avgDurationResult = db.prepare(`
      SELECT AVG(total_duration) as avg_duration 
      FROM queue_tickets 
      WHERE status = 'Done' AND DATE(created_at) = DATE(?)
    `).get(today) as { avg_duration: number | null };

    res.json({
      servedCount: servedCountResult.count,
      noShowCount: noShowResult.count,
      waitingDepth: waitingResult.count,
      avgWaitTime: avgDurationResult.avg_duration ? Math.round(avgDurationResult.avg_duration / 2) : 15
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

// GET /api/salon/barbers
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

// GET /api/salon/barbers/:idOrName
salonRouter.get('/barbers/:idOrName', (req: Request, res: Response) => {
  try {
    const { idOrName } = req.params;
    const cleanParam = idOrName.toLowerCase().trim();

    const barber = db.prepare(`
      SELECT * FROM barbers 
      WHERE id = ? OR LOWER(name) LIKE ?
    `).get(cleanParam, `%${cleanParam}%`) as any;

    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    res.json({
      ...barber,
      status: barber.is_on_break === 1 ? 'break' : barber.is_on_duty === 1 ? 'available' : 'off'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/salon/barbers/:id/status
// Toggle break / availability
salonRouter.patch('/barbers/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_on_break, is_on_duty } = req.body;

    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id) as any;
    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    if (typeof is_on_break === 'number' || typeof is_on_break === 'boolean') {
      const breakVal = is_on_break === true || is_on_break === 1 ? 1 : 0;
      db.prepare('UPDATE barbers SET is_on_break = ? WHERE id = ?').run(breakVal, id);
    }

    if (typeof is_on_duty === 'number' || typeof is_on_duty === 'boolean') {
      const dutyVal = is_on_duty === true || is_on_duty === 1 ? 1 : 0;
      db.prepare('UPDATE barbers SET is_on_duty = ? WHERE id = ?').run(dutyVal, id);
    }

    const updated = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id) as any;

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'BARBER_STATUS_CHANGED', barberId: id });
    } catch {
      // Socket optional in test
    }

    res.json({ success: true, barber: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
