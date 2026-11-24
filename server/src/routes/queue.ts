import { Router, Request, Response } from 'express';
import { db } from '../config/db.js';
import { getIO } from '../sockets/socket.js';
import crypto from 'crypto';

export const queueRouter = Router();

// Helper: Calculate wait time and position for a specific ticket according to docs/03-flows-rules.md Section 5
function calculateTicketWaitTime(ticket: any): { position: number; waitTime: number } {
  // If ticket is not in Waiting status, position/wait time are 0
  if (ticket.status !== 'Waiting') {
    return { position: 0, waitTime: 0 };
  }

  // 1. Fetch all active waiting tickets ordered by created_at strictly (FCFS)
  const waitingTickets = db.prepare(`
    SELECT * FROM queue_tickets 
    WHERE status = 'Waiting' 
    ORDER BY created_at ASC
  `).all() as any[];

  // Find index of this ticket
  const ticketIndex = waitingTickets.findIndex((t) => t.id === ticket.id || t.token === ticket.token);
  const position = ticketIndex >= 0 ? ticketIndex + 1 : 1;

  // Active barbers working (is_on_duty = 1 AND is_on_break = 0)
  const workingBarbers = db.prepare(`
    SELECT COUNT(*) as count 
    FROM barbers 
    WHERE is_on_duty = 1 AND is_on_break = 0
  `).get() as { count: number };
  const numBarbers = Math.max(1, workingBarbers.count);

  // Tickets ahead of this ticket in chronological order
  const ticketsAhead = ticketIndex > 0 ? waitingTickets.slice(0, ticketIndex) : [];

  // Wait time calculation per docs/03-flows-rules.md Section 5:
  // For "Any Barber": Wait Time = Total Duration of Services Ahead / Number of Barbers Working
  // For "Specific Barber": Wait Time = Total Duration of Services Ahead for this barber or Any / 1
  if (ticket.preferred_barber === 'any') {
    const durationAhead = ticketsAhead.reduce((sum, t) => sum + (t.total_duration || 0), 0);
    const waitTime = ticketIndex === 0 ? 5 : Math.max(5, Math.ceil(durationAhead / numBarbers));
    return { position, waitTime };
  } else {
    // Specific barber queue: customers ahead requesting this barber OR "any"
    const specificAhead = ticketsAhead.filter(
      (t) => t.preferred_barber === ticket.preferred_barber || t.preferred_barber === 'any'
    );
    const durationAhead = specificAhead.reduce((sum, t) => sum + (t.total_duration || 0), 0);
    const waitTime = ticketIndex === 0 ? 10 : Math.max(5, durationAhead);
    return { position, waitTime };
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

// GET /api/queue/barber/:barberId
// Station view for a specific barber: current customer (In Chair or Called), and up-next line
queueRouter.get('/barber/:barberId', (req: Request, res: Response) => {
  try {
    const { barberId } = req.params;
    const cleanId = barberId.toLowerCase().trim();

    // Verify barber
    const barber = db.prepare(`
      SELECT * FROM barbers 
      WHERE id = ? OR LOWER(name) LIKE ?
    `).get(cleanId, `%${cleanId}%`) as any;

    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    // 1. Current serving customer: Status 'In Chair' or 'Called' assigned to this barber
    const currentTicket = db.prepare(`
      SELECT * FROM queue_tickets 
      WHERE assigned_barber = ? AND status IN ('In Chair', 'Called')
      ORDER BY 
        CASE status 
          WHEN 'In Chair' THEN 1 
          WHEN 'Called' THEN 2 
        END ASC, created_at ASC
      LIMIT 1
    `).get(barber.id) as any;

    // Services map
    const services = db.prepare('SELECT id, name_en, name_gu, duration, price FROM services').all() as any[];
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    let currentCustomer = null;
    if (currentTicket) {
      const sIds = JSON.parse(currentTicket.service_ids || '[]');
      const ticketServices = sIds.map((id: number) => serviceMap.get(id)).filter(Boolean);

      // Elapsed service seconds if In Chair
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
    // Strictly customers assigned to this barber OR waiting customers selecting this barber OR selecting 'any' (FCFS)
    const waitingTickets = db.prepare(`
      SELECT * FROM queue_tickets 
      WHERE status = 'Waiting' AND (preferred_barber = ? OR preferred_barber = 'any')
      ORDER BY created_at ASC
    `).all(barber.id) as any[];

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

    res.json({
      barber: {
        ...barber,
        status: barber.is_on_break === 1 ? 'break' : barber.is_on_duty === 1 ? 'available' : 'off'
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
// Changes customer status from 'Called' to 'In Chair' and starts live timer
// Rule 4: Prevent starting another customer while chair is already occupied
queueRouter.post('/ticket/:id/start', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = db.prepare('SELECT * FROM queue_tickets WHERE id = ?').get(id) as any;
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
      const existingInChair = db.prepare(`
        SELECT * FROM queue_tickets 
        WHERE assigned_barber = ? AND status = 'In Chair' AND id != ?
      `).get(ticket.assigned_barber, id) as any;

      if (existingInChair) {
        res.status(400).json({
          error: `Chair is already occupied by ${existingInChair.customer_name} (${existingInChair.token}). Complete service before starting a new one.`
        });
        return;
      }
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE queue_tickets 
      SET status = 'In Chair', started_at = ? 
      WHERE id = ?
    `).run(now, id);

    const updated = db.prepare('SELECT * FROM queue_tickets WHERE id = ?').get(id) as any;

    try {
      getIO().emit('queue:updated', {
        type: 'SERVICE_STARTED',
        ticketId: id,
        token: updated.token,
        barberId: updated.assigned_barber
      });
    } catch {
      // Socket optional
    }

    res.json({ success: true, ticket: updated, message: `Service started for ${updated.customer_name} (${updated.token})` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/ticket/:id/done
// Changes customer status from 'In Chair' to 'Done'
queueRouter.post('/ticket/:id/done', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = db.prepare('SELECT * FROM queue_tickets WHERE id = ?').get(id) as any;
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
    db.prepare(`
      UPDATE queue_tickets 
      SET status = 'Done', completed_at = ? 
      WHERE id = ?
    `).run(now, id);

    const updated = db.prepare('SELECT * FROM queue_tickets WHERE id = ?').get(id) as any;

    try {
      getIO().emit('queue:updated', {
        type: 'SERVICE_COMPLETED',
        ticketId: id,
        token: updated.token,
        barberId: updated.assigned_barber
      });
    } catch {
      // Socket optional
    }

    res.json({ success: true, ticket: updated, message: `Service completed for ${updated.customer_name} (${updated.token})` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/queue/all (Live waiting and in-service tickets for Reception & TV)
queueRouter.get('/all', (_req: Request, res: Response) => {
  try {
    const tickets = db.prepare(`
      SELECT * FROM queue_tickets 
      WHERE status IN ('Waiting', 'Called', 'In Chair')
      ORDER BY created_at ASC
    `).all() as any[];

    // Fetch all active barbers & services to enrich data
    const barbers = db.prepare('SELECT id, name, chair FROM barbers').all() as any[];
    const barberMap = new Map(barbers.map((b) => [b.id, b]));

    const services = db.prepare('SELECT id, name_en, name_gu, duration, price FROM services').all() as any[];
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    const enrichedTickets = tickets.map((t) => {
      const { position, waitTime } = calculateTicketWaitTime(t);
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

      // Calculate elapsed waiting time in minutes
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
    });

    res.json(enrichedTickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/call-next
// Rule 2 & 3: Calls earliest customer requesting this barber OR "any"
// Rule 4: One customer per chair (cannot call if barber's chair is currently occupied in "In Chair" status)
queueRouter.post('/call-next', (req: Request, res: Response) => {
  try {
    const { barberId } = req.body;
    if (!barberId) {
      res.status(400).json({ error: 'Barber ID is required to call next customer.' });
      return;
    }

    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(barberId) as any;
    if (!barber) {
      res.status(404).json({ error: 'Barber not found.' });
      return;
    }

    // Check Rule 4: One customer per chair
    const occupied = db.prepare(`
      SELECT * FROM queue_tickets 
      WHERE assigned_barber = ? AND status = 'In Chair'
    `).get(barberId) as any;

    if (occupied) {
      res.status(400).json({
        error: `Chair is currently occupied by ${occupied.customer_name} (Token: ${occupied.token}). Complete service before calling next.`
      });
      return;
    }

    // If barber has a Called customer waiting to sit down, return that or allow re-calling
    // Scan waiting queue strictly in chronological order (FCFS)
    const waitingTickets = db.prepare(`
      SELECT * FROM queue_tickets 
      WHERE status = 'Waiting' 
      ORDER BY created_at ASC
    `).all() as any[];

    // Rule 2 & 3: Match earliest customer where preferred_barber == barberId OR preferred_barber == 'any'
    const targetTicket = waitingTickets.find(
      (t) => t.preferred_barber === barberId || t.preferred_barber === 'any'
    );

    if (!targetTicket) {
      res.status(404).json({ error: `No waiting customers available for ${barber.name}.` });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE queue_tickets 
      SET status = 'Called', assigned_barber = ?, called_at = ?
      WHERE id = ?
    `).run(barberId, now, targetTicket.id);

    const updatedTicket = db.prepare('SELECT * FROM queue_tickets WHERE id = ?').get(targetTicket.id) as any;

    try {
      getIO().emit('queue:updated', {
        type: 'CUSTOMER_CALLED',
        id: updatedTicket.id,
        token: updatedTicket.token,
        barberId,
        barberName: barber.name,
        chair: barber.chair
      });
    } catch {
      // Socket not active in standalone test
    }

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
// Rule 7 & 8: Mark customer No-show if called and not present
queueRouter.post('/ticket/:idOrToken/noshow', (req: Request, res: Response) => {
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

    if (ticket.status !== 'Called' && ticket.status !== 'Waiting') {
      res.status(400).json({ error: `Cannot mark '${ticket.status}' ticket as No-show.` });
      return;
    }

    db.prepare("UPDATE queue_tickets SET status = 'No-show' WHERE id = ?").run(ticket.id);

    try {
      getIO().emit('queue:updated', { type: 'TICKET_NOSHOW', id: ticket.id, token: ticket.token });
    } catch {
      // Socket not active
    }

    res.json({ success: true, message: `Ticket ${ticket.token} marked as No-show.` });
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
