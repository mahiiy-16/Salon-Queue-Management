import { Router, Request, Response } from 'express';
import { db } from '../config/db.js';
import { getIO } from '../sockets/socket.js';
import crypto from 'crypto';

export const queueRouter = Router();

// Helper: Calculate wait time for a specific ticket
function calculateTicketWaitTime(ticket: any): { position: number; waitTime: number } {
  // Find all waiting tickets ordered by created_at (FCFS)
  const waitingTickets = db.prepare(`
    SELECT * FROM queue_tickets 
    WHERE status = 'Waiting' 
    ORDER BY created_at ASC
  `).all() as any[];

  // Find index of this ticket
  const ticketIndex = waitingTickets.findIndex((t) => t.id === ticket.id || t.token === ticket.token);
  const position = ticketIndex >= 0 ? ticketIndex + 1 : 1;

  // Active barbers working
  const workingBarbers = db.prepare(`
    SELECT COUNT(*) as count 
    FROM barbers 
    WHERE is_on_duty = 1 AND is_on_break = 0
  `).get() as { count: number };
  const numBarbers = Math.max(1, workingBarbers.count);

  if (ticketIndex <= 0) {
    return { position: 1, waitTime: ticket.preferred_barber === 'any' ? 5 : 10 };
  }

  // Sum durations of all tickets ahead
  const ticketsAhead = waitingTickets.slice(0, ticketIndex);
  let durationAhead = 0;

  if (ticket.preferred_barber === 'any') {
    durationAhead = ticketsAhead.reduce((sum, t) => sum + t.total_duration, 0);
    const waitTime = Math.ceil(durationAhead / numBarbers);
    return { position, waitTime: Math.max(5, waitTime) };
  } else {
    // Specific barber queue
    const specificAhead = ticketsAhead.filter(
      (t) => t.preferred_barber === ticket.preferred_barber || t.preferred_barber === 'any'
    );
    durationAhead = specificAhead.reduce((sum, t) => sum + t.total_duration, 0);
    return { position, waitTime: Math.max(5, durationAhead) };
  }
}

// POST /api/queue/join
queueRouter.post('/join', (req: Request, res: Response) => {
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
    const activeTicket = db.prepare(`
      SELECT id, token, status FROM queue_tickets 
      WHERE phone = ? AND status IN ('Waiting', 'Called', 'In Chair')
    `).get(cleanPhone) as any;

    if (activeTicket) {
      res.status(400).json({
        error: `A queue spot is already active for this phone number (Token: ${activeTicket.token}, Status: ${activeTicket.status}).`,
        existingToken: activeTicket.token,
        existingId: activeTicket.id
      });
      return;
    }

    // 5. Rule 9: Online queue cutoff (check if open)
    const queueSetting = db.prepare("SELECT value FROM settings WHERE key = 'queue_open'").get() as { value: string } | undefined;
    if (queueSetting && queueSetting.value === 'false') {
      res.status(400).json({ error: 'The salon queue is currently closed to new entries.' });
      return;
    }

    // 6. Fetch services from database and compute duration & price
    const placeholders = serviceIds.map(() => '?').join(',');
    const services = db.prepare(`SELECT * FROM services WHERE id IN (${placeholders})`).all(...serviceIds) as any[];

    if (services.length !== serviceIds.length) {
      res.status(400).json({ error: 'One or more selected services are invalid.' });
      return;
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    // 7. Generate daily sequential token (e.g. S-01, S-02)
    const countResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE DATE(created_at) = DATE('now')
    `).get() as { count: number };

    const tokenNumber = (countResult.count + 1).toString().padStart(2, '0');
    const token = `S-${tokenNumber}`;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 8. Insert ticket into SQLite
    const insertStmt = db.prepare(`
      INSERT INTO queue_tickets (
        id, token, customer_name, phone, preferred_barber, 
        service_ids, total_duration, total_price, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Waiting', ?)
    `);

    insertStmt.run(
      id,
      token,
      customerName.trim(),
      cleanPhone,
      preferredBarber || 'any',
      JSON.stringify(serviceIds),
      totalDuration,
      totalPrice,
      createdAt
    );

    // 9. Calculate initial queue position and wait time
    const createdTicket = db.prepare('SELECT * FROM queue_tickets WHERE id = ?').get(id) as any;
    const { position, waitTime } = calculateTicketWaitTime(createdTicket);

    // 10. Broadcast real-time update
    try {
      getIO().emit('queue:updated', { type: 'TICKET_CREATED', token, id });
    } catch {
      // Socket not active in standalone test mode
    }

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
queueRouter.get('/ticket/:idOrToken', (req: Request, res: Response) => {
  try {
    const { idOrToken } = req.params;

    const ticket = db.prepare(`
      SELECT * FROM queue_tickets 
      WHERE id = ? OR token = ?
    `).get(idOrToken, idOrToken) as any;

    if (!ticket) {
      res.status(404).json({ error: 'Queue ticket not found.' });
      return;
    }

    const { position, waitTime } = calculateTicketWaitTime(ticket);

    // Fetch service objects
    const serviceIds = JSON.parse(ticket.service_ids || '[]');
    let services: any[] = [];
    if (serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => '?').join(',');
      services = db.prepare(`SELECT * FROM services WHERE id IN (${placeholders})`).all(...serviceIds);
    }

    // Preferred barber name
    let barberName = 'Any Barber (Fastest)';
    if (ticket.preferred_barber && ticket.preferred_barber !== 'any') {
      const barber = db.prepare('SELECT name, chair FROM barbers WHERE id = ?').get(ticket.preferred_barber) as any;
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

// POST /api/queue/ticket/:idOrToken/cancel
queueRouter.post('/ticket/:idOrToken/cancel', (req: Request, res: Response) => {
  try {
    const { idOrToken } = req.params;

    const ticket = db.prepare(`
      SELECT * FROM queue_tickets 
      WHERE id = ? OR token = ?
    `).get(idOrToken, idOrToken) as any;

    if (!ticket) {
      res.status(404).json({ error: 'Queue ticket not found.' });
      return;
    }

    if (ticket.status !== 'Waiting' && ticket.status !== 'Called') {
      res.status(400).json({ error: `Cannot cancel ticket with status '${ticket.status}'.` });
      return;
    }

    db.prepare("UPDATE queue_tickets SET status = 'Cancelled' WHERE id = ?").run(ticket.id);

    try {
      getIO().emit('queue:updated', { type: 'TICKET_CANCELLED', id: ticket.id, token: ticket.token });
    } catch {
      // Socket not active in standalone test mode
    }

    res.json({ success: true, message: 'Ticket cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
