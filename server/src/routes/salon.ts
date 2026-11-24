import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/db.js';

export const salonRouter = Router();

// GET /api/salon/status
salonRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const queueSetting = await queryOne<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'queue_open'"
    );
    const isQueueOpen = queueSetting ? queueSetting.value === 'true' : true;

    // Count waiting customers
    const waitingCountResult = await queryOne<{ count: string | number; total_duration: string | number }>(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_duration), 0) as total_duration 
      FROM queue_tickets 
      WHERE status = 'Waiting'
    `);

    // Count in-chair customers
    const inChairResult = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'In Chair'
    `);

    // Active barbers working (on duty and not on break)
    const workingBarbersResult = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) as count 
      FROM barbers 
      WHERE is_on_duty = 1 AND is_on_break = 0
    `);

    const waitingCount = parseInt(String(waitingCountResult?.count || 0), 10);
    const inChairCount = parseInt(String(inChairResult?.count || 0), 10);
    const workingBarbersCount = parseInt(String(workingBarbersResult?.count || 1), 10) || 1;
    const totalDurationAhead = parseInt(String(waitingCountResult?.total_duration || 0), 10);

    // Formula: Total Duration of Services Ahead / Number of Barbers Working
    const estimatedWaitTime = Math.ceil(totalDurationAhead / workingBarbersCount);

    res.json({
      isOpen: isQueueOpen,
      waitingCount,
      inChairCount,
      workingBarbersCount,
      estimatedWaitTime: waitingCount === 0 ? 0 : Math.max(5, estimatedWaitTime),
      closingTime: '21:00'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/salon/services/all (All services including disabled, for Admin)
salonRouter.get('/services/all', async (_req: Request, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM services ORDER BY id ASC');
    const formatted = rows.map((s) => ({
      ...s,
      duration: parseInt(String(s.duration), 10),
      price: parseFloat(String(s.price)),
      is_active: parseInt(String(s.is_active), 10)
    }));
    res.json(formatted);
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

    const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    await query(`
      INSERT INTO services (name_en, name_gu, duration, price, description_en, description_gu, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      name_en.trim(),
      name_gu.trim(),
      numDuration,
      numPrice,
      (description_en || '').trim(),
      (description_gu || '').trim(),
      activeVal
    ]);

    const created = await queryOne('SELECT * FROM services ORDER BY id DESC LIMIT 1');

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'SERVICES_UPDATED' });
    } catch {}

    res.status(201).json({
      success: true,
      service: created ? {
        ...created,
        duration: parseInt(String(created.duration), 10),
        price: parseFloat(String(created.price)),
        is_active: parseInt(String(created.is_active), 10)
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/salon/services/:id (Update service)
salonRouter.put('/services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name_en, name_gu, duration, price, description_en, description_gu, is_active } = req.body;

    const existing = await queryOne('SELECT * FROM services WHERE id = $1', [id]);
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

    const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    await query(`
      UPDATE services 
      SET name_en = $1, name_gu = $2, duration = $3, price = $4, 
          description_en = $5, description_gu = $6, is_active = $7
      WHERE id = $8
    `, [
      name_en.trim(),
      name_gu.trim(),
      numDuration,
      numPrice,
      (description_en || '').trim(),
      (description_gu || '').trim(),
      activeVal,
      id
    ]);

    const updated = await queryOne('SELECT * FROM services WHERE id = $1', [id]);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'SERVICES_UPDATED' });
    } catch {}

    res.json({
      success: true,
      service: updated ? {
        ...updated,
        duration: parseInt(String(updated.duration), 10),
        price: parseFloat(String(updated.price)),
        is_active: parseInt(String(updated.is_active), 10)
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/salon/services/:id
salonRouter.delete('/services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM services WHERE id = $1', [id]);

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

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const existing = await queryOne('SELECT * FROM barbers WHERE id = $1', [id]);
    if (existing) {
      res.status(400).json({ error: `Barber with ID '${id}' already exists.` });
      return;
    }

    const onDuty = is_on_duty !== undefined ? (is_on_duty ? 1 : 0) : 1;
    const onBreak = is_on_break !== undefined ? (is_on_break ? 1 : 0) : 0;

    await query(`
      INSERT INTO barbers (id, name, chair, specialization, is_on_duty, is_on_break)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      name.trim(),
      chair.trim(),
      (specialization || 'Master Stylist').trim(),
      onDuty,
      onBreak
    ]);

    const created = await queryOne('SELECT * FROM barbers WHERE id = $1', [id]);

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

    const existing = await queryOne('SELECT * FROM barbers WHERE id = $1', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    const onDuty = is_on_duty !== undefined ? (is_on_duty ? 1 : 0) : 1;
    const onBreak = is_on_break !== undefined ? (is_on_break ? 1 : 0) : 0;

    await query(`
      UPDATE barbers 
      SET name = $1, chair = $2, specialization = $3, is_on_duty = $4, is_on_break = $5
      WHERE id = $6
    `, [
      name.trim(),
      chair.trim(),
      (specialization || 'Master Stylist').trim(),
      onDuty,
      onBreak,
      id
    ]);

    const updated = await queryOne('SELECT * FROM barbers WHERE id = $1', [id]);

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
    await query('DELETE FROM barbers WHERE id = $1', [id]);

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

    await query(`
      INSERT INTO settings (key, value) VALUES ('queue_open', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [valStr]);

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
salonRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total served today
    const servedCountResult = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'Done' AND DATE(created_at) = DATE($1)
    `, [today]);

    // Total no-shows today
    const noShowResult = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'No-show' AND DATE(created_at) = DATE($1)
    `, [today]);

    // Active queue depth
    const waitingResult = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE status = 'Waiting'
    `);

    // Average duration of services
    const avgDurationResult = await queryOne<{ avg_duration: string | number | null }>(`
      SELECT AVG(total_duration) as avg_duration 
      FROM queue_tickets 
      WHERE status = 'Done' AND DATE(created_at) = DATE($1)
    `, [today]);

    const servedCount = parseInt(String(servedCountResult?.count || 0), 10);
    const noShowCount = parseInt(String(noShowResult?.count || 0), 10);
    const waitingDepth = parseInt(String(waitingResult?.count || 0), 10);
    const avgVal = avgDurationResult?.avg_duration ? parseFloat(String(avgDurationResult.avg_duration)) : null;

    res.json({
      servedCount,
      noShowCount,
      waitingDepth,
      avgWaitTime: avgVal ? Math.round(avgVal / 2) : 15
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/services
salonRouter.get('/services', async (_req: Request, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM services WHERE is_active = 1 ORDER BY id ASC');
    const formatted = rows.map((s) => ({
      ...s,
      duration: parseInt(String(s.duration), 10),
      price: parseFloat(String(s.price)),
      is_active: parseInt(String(s.is_active), 10)
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/salon/barbers
salonRouter.get('/barbers', async (_req: Request, res: Response) => {
  try {
    const { rows: barbers } = await query('SELECT * FROM barbers ORDER BY chair ASC');

    // Calculate queue depth for each barber
    const enrichedBarbers = await Promise.all(barbers.map(async (barber) => {
      const queueDepth = await queryOne<{ count: string | number }>(`
        SELECT COUNT(*) as count 
        FROM queue_tickets 
        WHERE status = 'Waiting' AND (preferred_barber = $1 OR preferred_barber = 'any')
      `, [barber.id]);

      const isBreak = parseInt(String(barber.is_on_break), 10) === 1;
      const isDuty = parseInt(String(barber.is_on_duty), 10) === 1;

      return {
        ...barber,
        queueDepth: parseInt(String(queueDepth?.count || 0), 10),
        status: isBreak ? 'break' : isDuty ? 'available' : 'off'
      };
    }));

    res.json(enrichedBarbers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/salon/barbers/:idOrName
salonRouter.get('/barbers/:idOrName', async (req: Request, res: Response) => {
  try {
    const { idOrName } = req.params;
    const cleanParam = idOrName.toLowerCase().trim();

    const barber = await queryOne(`
      SELECT * FROM barbers 
      WHERE id = $1 OR LOWER(name) LIKE $2
    `, [cleanParam, `%${cleanParam}%`]);

    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    const isBreak = parseInt(String(barber.is_on_break), 10) === 1;
    const isDuty = parseInt(String(barber.is_on_duty), 10) === 1;

    res.json({
      ...barber,
      status: isBreak ? 'break' : isDuty ? 'available' : 'off'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/salon/barbers/:id/status
salonRouter.patch('/barbers/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_on_break, is_on_duty } = req.body;

    const barber = await queryOne('SELECT * FROM barbers WHERE id = $1', [id]);
    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    if (typeof is_on_break === 'number' || typeof is_on_break === 'boolean') {
      const breakVal = is_on_break === true || is_on_break === 1 ? 1 : 0;
      await query('UPDATE barbers SET is_on_break = $1 WHERE id = $2', [breakVal, id]);
    }

    if (typeof is_on_duty === 'number' || typeof is_on_duty === 'boolean') {
      const dutyVal = is_on_duty === true || is_on_duty === 1 ? 1 : 0;
      await query('UPDATE barbers SET is_on_duty = $1 WHERE id = $2', [dutyVal, id]);
    }

    const updated = await queryOne('SELECT * FROM barbers WHERE id = $1', [id]);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'BARBER_STATUS_CHANGED', barberId: id });
    } catch {}

    res.json({ success: true, barber: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
