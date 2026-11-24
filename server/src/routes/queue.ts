import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/db.js';
import crypto from 'crypto';

export const queueRouter = Router();

// Helper: Calculate wait time and position for a specific ticket according to docs/03-flows-rules.md Section 5
async function calculateTicketWaitTime(ticket: any): Promise<{ position: number; waitTime: number }> {
  if (ticket.status !== 'Waiting') {
    return { position: 0, waitTime: 0 };
  }

  // 1. Fetch all active waiting tickets ordered by created_at strictly (FCFS)
  const { rows: waitingTickets } = await query(`
    SELECT * FROM queue_tickets 
    WHERE status = 'Waiting' 
    ORDER BY created_at ASC
  `);

  const ticketIndex = waitingTickets.findIndex((t) => t.id === ticket.id || t.token === ticket.token);
  const position = ticketIndex >= 0 ? ticketIndex + 1 : 1;

  // Active barbers working (is_on_duty = 1 AND is_on_break = 0)
  const workingBarbers = await queryOne<{ count: string | number }>(`
    SELECT COUNT(*) as count 
    FROM barbers 
    WHERE is_on_duty = 1 AND is_on_break = 0
  `);
  const numBarbers = Math.max(1, parseInt(String(workingBarbers?.count || 1), 10));

  const ticketsAhead = ticketIndex > 0 ? waitingTickets.slice(0, ticketIndex) : [];

  if (ticket.preferred_barber === 'any') {
    const durationAhead = ticketsAhead.reduce((sum, t) => sum + (parseInt(String(t.total_duration), 10) || 0), 0);
    const waitTime = ticketIndex === 0 ? 5 : Math.max(5, Math.ceil(durationAhead / numBarbers));
    return { position, waitTime };
  } else {
    const specificAhead = ticketsAhead.filter(
      (t) => t.preferred_barber === ticket.preferred_barber || t.preferred_barber === 'any'
    );
    const durationAhead = specificAhead.reduce((sum, t) => sum + (parseInt(String(t.total_duration), 10) || 0), 0);
    const waitTime = ticketIndex === 0 ? 10 : Math.max(5, durationAhead);
    return { position, waitTime };
  }
}

// POST /api/queue/join
queueRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const { customerName, phone, serviceIds, preferredBarber } = req.body;

    // 1. Validation: Name
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid customer name (at least 2 characters).' });
      return;
    }

    // 2. Validation: Phone (Strict 10 Digits)
    const cleanPhone = (phone || '').toString().trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    // 3. Validation: Rule 6 (Max 3 services, at least 1)
    if (!Array.isArray(serviceIds) || serviceIds.length < 1 || serviceIds.length > 3) {
      res.status(400).json({ error: 'You must select between 1 and 3 services.' });
      return;
    }

    // 4. Rule 5: One active queue spot per phone number
    const activeTicket = await queryOne(`
      SELECT id, token, status FROM queue_tickets 
      WHERE phone = $1 AND status IN ('Waiting', 'Called', 'In Chair')
    `, [cleanPhone]);

    if (activeTicket) {
      res.status(400).json({
        error: `A queue spot is already active for this phone number (Token: ${activeTicket.token}, Status: ${activeTicket.status}).`,
        existingToken: activeTicket.token,
        existingId: activeTicket.id
      });
      return;
    }

    // 5. Rule 9 & 10: Online queue cutoff (check if open)
    const { isWalkIn } = req.body;
    const queueSetting = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'queue_open'");
    if (queueSetting && queueSetting.value === 'false' && !isWalkIn) {
      res.status(400).json({ error: 'The salon queue is currently closed to new entries.' });
      return;
    }

    // 6. Fetch services from database and compute duration & price
    const placeholders = serviceIds.map((_, idx) => `$${idx + 1}`).join(',');
    const { rows: services } = await query(`SELECT * FROM services WHERE id IN (${placeholders})`, serviceIds);

    if (services.length !== serviceIds.length) {
      res.status(400).json({ error: 'One or more selected services are invalid.' });
      return;
    }

    const totalDuration = services.reduce((sum, s) => sum + parseInt(String(s.duration), 10), 0);
    const totalPrice = services.reduce((sum, s) => sum + parseFloat(String(s.price)), 0);

    // 7. Generate daily sequential token (e.g. S-01, S-02)
    const todayStr = new Date().toISOString().split('T')[0];
    const countResult = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE DATE(created_at) = DATE($1)
    `, [todayStr]);

    const countNum = parseInt(String(countResult?.count || 0), 10);
    const tokenNumber = (countNum + 1).toString().padStart(2, '0');
    const token = `S-${tokenNumber}`;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 8. Insert ticket into database
    await query(`
      INSERT INTO queue_tickets (
        id, token, customer_name, phone, preferred_barber, 
        service_ids, total_duration, total_price, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Waiting', $9)
    `, [
      id,
      token,
      customerName.trim(),
      cleanPhone,
      preferredBarber || 'any',
      JSON.stringify(serviceIds),
      totalDuration,
      totalPrice,
      createdAt
    ]);

    // 9. Calculate initial queue position and wait time
    const createdTicket = await queryOne('SELECT * FROM queue_tickets WHERE id = $1', [id]);
    const { position, waitTime } = await calculateTicketWaitTime(createdTicket);

    // 10. Broadcast real-time update
    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'TICKET_CREATED', token, id });
    } catch {}

    res.status(201).json({
      success: true,
      ticket: {
        ...createdTicket,
        serviceIds: JSON.parse(createdTicket.service_ids),
        position,
        estimatedWaitTime: waitTime
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/queue/ticket/:idOrToken
queueRouter.get('/ticket/:idOrToken', async (req: Request, res: Response) => {
  try {
    const { idOrToken } = req.params;

    const ticket = await queryOne(`
      SELECT * FROM queue_tickets 
      WHERE id = $1 OR token = $2
    `, [idOrToken, idOrToken]);

    if (!ticket) {
      res.status(404).json({ error: 'Queue ticket not found.' });
      return;
    }

    const { position, waitTime } = await calculateTicketWaitTime(ticket);

    // Fetch service objects
    const serviceIds = JSON.parse(ticket.service_ids || '[]');
    let services: any[] = [];
    if (serviceIds.length > 0) {
      const placeholders = serviceIds.map((_: any, idx: number) => `$${idx + 1}`).join(',');
      const resServices = await query(`SELECT * FROM services WHERE id IN (${placeholders})`, serviceIds);
      services = resServices.rows.map((s) => ({
        ...s,
        duration: parseInt(String(s.duration), 10),
        price: parseFloat(String(s.price))
      }));
    }

    // Preferred barber name
    let barberName = 'Any Barber (Fastest)';
    if (ticket.preferred_barber && ticket.preferred_barber !== 'any') {
      const barber = await queryOne<{ name: string; chair: string }>(
        'SELECT name, chair FROM barbers WHERE id = $1',
        [ticket.preferred_barber]
      );
      if (barber) {
        barberName = `${barber.name} (${barber.chair})`;
      }
    }

    res.json({
      ...ticket,
      serviceIds,
      services,
      barberName,
      position: ticket.status === 'Waiting' ? position : 0,
      estimatedWaitTime: ticket.status === 'Waiting' ? waitTime : 0,
      isStartComing: ticket.status === 'Waiting' && position === 2,
      isYourTurn: ticket.status === 'Called'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/queue/barber/:barberId
queueRouter.get('/barber/:barberId', async (req: Request, res: Response) => {
  try {
    const { barberId } = req.params;
    const cleanId = barberId.toLowerCase().trim();

    // Verify barber
    const barber = await queryOne(`
      SELECT * FROM barbers 
      WHERE id = $1 OR LOWER(name) LIKE $2
    `, [cleanId, `%${cleanId}%`]);

    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    // 1. Current serving customer: Status 'In Chair' or 'Called' assigned to this barber
    const currentTicket = await queryOne(`
      SELECT * FROM queue_tickets 
      WHERE assigned_barber = $1 AND status IN ('In Chair', 'Called')
      ORDER BY 
        CASE status 
          WHEN 'In Chair' THEN 1 
          WHEN 'Called' THEN 2 
        END ASC, created_at ASC
      LIMIT 1
    `, [barber.id]);

    // Services map
    const { rows: services } = await query('SELECT id, name_en, name_gu, duration, price FROM services');
    const serviceMap = new Map(services.map((s) => [s.id, {
      ...s,
      duration: parseInt(String(s.duration), 10),
      price: parseFloat(String(s.price))
    }]));

    let currentCustomer = null;
    if (currentTicket) {
      const sIds = JSON.parse(currentTicket.service_ids || '[]');
      const ticketServices = sIds.map((id: number) => serviceMap.get(id)).filter(Boolean);

      let elapsedSeconds = 0;
      if (currentTicket.status === 'In Chair' && currentTicket.started_at) {
        elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(currentTicket.started_at).getTime()) / 1000));
      }

      currentCustomer = {
        ...currentTicket,
        services: ticketServices,
        elapsedSeconds
      };
    }

    // 2. Up next queue line:
    const { rows: waitingTickets } = await query(`
      SELECT * FROM queue_tickets 
      WHERE status = 'Waiting' AND (preferred_barber = $1 OR preferred_barber = 'any')
      ORDER BY created_at ASC
    `, [barber.id]);

    const enrichedUpNext = waitingTickets.map((t) => {
      const sIds = JSON.parse(t.service_ids || '[]');
      const ticketServices = sIds.map((id: number) => serviceMap.get(id)).filter(Boolean);
      const elapsedMinutes = Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60));

      return {
        ...t,
        services: ticketServices,
        elapsedMinutes
      };
    });

    const isBreak = parseInt(String(barber.is_on_break), 10) === 1;
    const isDuty = parseInt(String(barber.is_on_duty), 10) === 1;

    res.json({
      barber: {
        ...barber,
        status: isBreak ? 'break' : isDuty ? 'available' : 'off'
      },
      currentCustomer,
      upNext: enrichedUpNext,
      totalWaitingCount: enrichedUpNext.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/ticket/:id/start
queueRouter.post('/ticket/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await queryOne('SELECT * FROM queue_tickets WHERE id = $1', [id]);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    if (ticket.status !== 'Called') {
      res.status(400).json({
        error: `Cannot start service for ticket with status '${ticket.status}'. Ticket must be 'Called' first.`
      });
      return;
    }

    // Check Rule 4: Barber can only have ONE customer in chair
    if (ticket.assigned_barber) {
      const existingInChair = await queryOne(`
        SELECT * FROM queue_tickets 
        WHERE assigned_barber = $1 AND status = 'In Chair' AND id != $2
      `, [ticket.assigned_barber, id]);

      if (existingInChair) {
        res.status(400).json({
          error: `Chair is already occupied by ${existingInChair.customer_name} (${existingInChair.token}). Complete service before starting a new one.`
        });
        return;
      }
    }

    const now = new Date().toISOString();
    await query(`
      UPDATE queue_tickets 
      SET status = 'In Chair', started_at = $1 
      WHERE id = $2
    `, [now, id]);

    const updated = await queryOne('SELECT * FROM queue_tickets WHERE id = $1', [id]);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', {
        type: 'SERVICE_STARTED',
        ticketId: id,
        token: updated.token,
        barberId: updated.assigned_barber
      });
    } catch {}

    res.json({ success: true, ticket: updated, message: `Service started for ${updated.customer_name} (${updated.token})` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/ticket/:id/done
queueRouter.post('/ticket/:id/done', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await queryOne('SELECT * FROM queue_tickets WHERE id = $1', [id]);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    if (ticket.status !== 'In Chair') {
      res.status(400).json({
        error: `Cannot complete ticket with status '${ticket.status}'. Ticket must be 'In Chair'.`
      });
      return;
    }

    const now = new Date().toISOString();
    await query(`
      UPDATE queue_tickets 
      SET status = 'Done', completed_at = $1 
      WHERE id = $2
    `, [now, id]);

    const updated = await queryOne('SELECT * FROM queue_tickets WHERE id = $1', [id]);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', {
        type: 'SERVICE_COMPLETED',
        ticketId: id,
        token: updated.token,
        barberId: updated.assigned_barber
      });
    } catch {}

    res.json({ success: true, ticket: updated, message: `Service completed for ${updated.customer_name} (${updated.token})` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/queue/all
queueRouter.get('/all', async (_req: Request, res: Response) => {
  try {
    const { rows: tickets } = await query(`
      SELECT * FROM queue_tickets 
      WHERE status IN ('Waiting', 'Called', 'In Chair')
      ORDER BY created_at ASC
    `);

    const { rows: barbers } = await query('SELECT id, name, chair FROM barbers');
    const barberMap = new Map(barbers.map((b) => [b.id, b]));

    const { rows: services } = await query('SELECT id, name_en, name_gu, duration, price FROM services');
    const serviceMap = new Map(services.map((s) => [s.id, {
      ...s,
      duration: parseInt(String(s.duration), 10),
      price: parseFloat(String(s.price))
    }]));

    const enrichedTickets = await Promise.all(tickets.map(async (t) => {
      const { position, waitTime } = await calculateTicketWaitTime(t);
      const sIds = JSON.parse(t.service_ids || '[]');
      const ticketServices = sIds.map((id: number) => serviceMap.get(id)).filter(Boolean);

      let prefBarberName = 'Any Barber (Fastest)';
      if (t.preferred_barber && t.preferred_barber !== 'any') {
        const b = barberMap.get(t.preferred_barber);
        if (b) prefBarberName = `${b.name} (${b.chair})`;
      }

      let assignedBarberName = null;
      if (t.assigned_barber) {
        const b = barberMap.get(t.assigned_barber);
        if (b) assignedBarberName = `${b.name} (${b.chair})`;
      }

      const createdTime = new Date(t.created_at).getTime();
      const now = Date.now();
      const elapsedMinutes = Math.floor((now - createdTime) / (1000 * 60));

      return {
        ...t,
        serviceIds: sIds,
        services: ticketServices,
        preferredBarberName: prefBarberName,
        assignedBarberName,
        position,
        estimatedWaitTime: waitTime,
        elapsedMinutes,
        isOverdue: elapsedMinutes >= 60 && t.status === 'Waiting'
      };
    }));

    res.json(enrichedTickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/call-next
queueRouter.post('/call-next', async (req: Request, res: Response) => {
  try {
    const { barberId } = req.body;
    if (!barberId) {
      res.status(400).json({ error: 'Barber ID is required to call next customer.' });
      return;
    }

    const barber = await queryOne('SELECT * FROM barbers WHERE id = $1', [barberId]);
    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    // Check Rule 4: One customer per chair
    const occupied = await queryOne(`
      SELECT * FROM queue_tickets 
      WHERE assigned_barber = $1 AND status = 'In Chair'
    `, [barberId]);

    if (occupied) {
      res.status(400).json({
        error: `Chair is currently occupied by ${occupied.customer_name} (Token: ${occupied.token}). Complete service before calling next.`
      });
      return;
    }

    const { rows: waitingTickets } = await query(`
      SELECT * FROM queue_tickets 
      WHERE status = 'Waiting' 
      ORDER BY created_at ASC
    `);

    // Rule 2 & 3: Match earliest customer where preferred_barber == barberId OR preferred_barber == 'any'
    const targetTicket = waitingTickets.find(
      (t) => t.preferred_barber === barberId || t.preferred_barber === 'any'
    );

    if (!targetTicket) {
      res.status(404).json({ error: `No waiting customers available for ${barber.name}.` });
      return;
    }

    const now = new Date().toISOString();
    await query(`
      UPDATE queue_tickets 
      SET status = 'Called', assigned_barber = $1, called_at = $2
      WHERE id = $3
    `, [barberId, now, targetTicket.id]);

    const updatedTicket = await queryOne('SELECT * FROM queue_tickets WHERE id = $1', [targetTicket.id]);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', {
        type: 'CUSTOMER_CALLED',
        id: updatedTicket.id,
        token: updatedTicket.token,
        barberId,
        barberName: barber.name,
        chair: barber.chair
      });
    } catch {}

    res.json({
      success: true,
      ticket: updatedTicket,
      message: `Called ${updatedTicket.customer_name} (${updatedTicket.token}) to ${barber.chair} (${barber.name})`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/ticket/:idOrToken/noshow
queueRouter.post('/ticket/:idOrToken/noshow', async (req: Request, res: Response) => {
  try {
    const { idOrToken } = req.params;

    const ticket = await queryOne(`
      SELECT * FROM queue_tickets 
      WHERE id = $1 OR token = $2
    `, [idOrToken, idOrToken]);

    if (!ticket) {
      res.status(404).json({ error: 'Queue ticket not found.' });
      return;
    }

    if (ticket.status !== 'Called' && ticket.status !== 'Waiting') {
      res.status(400).json({ error: `Cannot mark '${ticket.status}' ticket as No-show.` });
      return;
    }

    await query("UPDATE queue_tickets SET status = 'No-show' WHERE id = $1", [ticket.id]);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'TICKET_NOSHOW', id: ticket.id, token: ticket.token });
    } catch {}

    res.json({ success: true, message: `Ticket ${ticket.token} marked as No-show.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/ticket/:idOrToken/cancel
queueRouter.post('/ticket/:idOrToken/cancel', async (req: Request, res: Response) => {
  try {
    const { idOrToken } = req.params;

    const ticket = await queryOne(`
      SELECT * FROM queue_tickets 
      WHERE id = $1 OR token = $2
    `, [idOrToken, idOrToken]);

    if (!ticket) {
      res.status(404).json({ error: 'Queue ticket not found.' });
      return;
    }

    if (ticket.status !== 'Waiting' && ticket.status !== 'Called') {
      res.status(400).json({ error: `Cannot cancel ticket with status '${ticket.status}'.` });
      return;
    }

    await query("UPDATE queue_tickets SET status = 'Cancelled' WHERE id = $1", [ticket.id]);

    try {
      const { getIO } = await import('../sockets/socket.js');
      getIO().emit('queue:updated', { type: 'TICKET_CANCELLED', id: ticket.id, token: ticket.token });
    } catch {}

    res.json({ success: true, message: 'Ticket cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
