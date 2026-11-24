import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Plus, Scissors, CheckCircle2, Trash2, UserX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';
import { apiEndpoint } from '../lib/api';

interface Barber {
  id: string;
  name: string;
  chair: string;
  specialization: string;
  is_on_duty: number;
  is_on_break: number;
  status: 'available' | 'busy' | 'break' | 'off';
  currentCustomer?: {
    token: string;
    customer_name: string;
    services: string;
    status: string;
  } | null;
}

interface Service {
  id: number;
  name_en: string;
  name_gu: string;
  duration: number;
  price: number;
}

interface QueueItem {
  id: string;
  token: string;
  customer_name: string;
  phone: string;
  preferred_barber: string;
  assigned_barber: string | null;
  service_ids: string;
  services: Service[];
  preferredBarberName: string;
  assignedBarberName: string | null;
  total_duration: number;
  total_price: number;
  status: 'Waiting' | 'Called' | 'In Chair';
  position: number;
  estimatedWaitTime: number;
  elapsedMinutes: number;
  isOverdue: boolean;
  created_at: string;
}

export const ReceptionPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { socket } = useSocket();

  // Live state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Walk-in form state
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinServices, setWalkinServices] = useState<number[]>([]);
  const [walkinBarber, setWalkinBarber] = useState('any');
  const [submittingWalkin, setSubmittingWalkin] = useState(false);

  // Calling barber spinner
  const [callingBarberId, setCallingBarberId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [queueRes, barbersRes, servicesRes] = await Promise.all([
        fetch(apiEndpoint('/api/queue/all')),
        fetch(apiEndpoint('/api/salon/barbers')),
        fetch(apiEndpoint('/api/salon/services'))
      ]);

      let currentQueue: QueueItem[] = [];
      if (queueRes.ok) {
        currentQueue = await queueRes.json();
        setQueue(currentQueue);
      }

      if (servicesRes.ok) {
        const sData = await servicesRes.json();
        setServices(sData);
        if (sData.length > 0 && walkinServices.length === 0) {
          setWalkinServices([sData[0].id]);
        }
      }

      if (barbersRes.ok) {
        const bData: Barber[] = await barbersRes.json();
        // Match current customer in chair or called for each barber
        const enrichedBarbers = bData.map((b) => {
          const activeItem = currentQueue.find(
            (q) => q.assigned_barber === b.id && (q.status === 'In Chair' || q.status === 'Called')
          );
          return {
            ...b,
            currentCustomer: activeItem
              ? {
                  token: activeItem.token,
                  customer_name: activeItem.customer_name,
                  services: activeItem.services.map((s) => s.name_en).join(', '),
                  status: activeItem.status
                }
              : null
          };
        });
        setBarbers(enrichedBarbers);
      }
    } catch (err) {
      console.error('Failed to fetch reception dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
      socket.on('queue:updated', () => {
        fetchDashboardData();
      });

      return () => {
        socket.off('queue:updated');
      };
    }
  }, [socket]);

  // Handle Call Next customer for a specific barber
  const handleCallNext = async (barberId: string) => {
    setCallingBarberId(barberId);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const res = await fetch(apiEndpoint('/api/queue/call-next'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to call next customer.');
      } else {
        setActionMessage(data.message);
        fetchDashboardData();
      }
    } catch {
      setErrorMessage('Network error while calling next customer.');
    } finally {
      setCallingBarberId(null);
    }
  };

  // Handle No-Show (Rule 7 & 8)
  const handleNoShow = async (ticket: QueueItem) => {
    if (!window.confirm(`Mark customer ${ticket.customer_name} (${ticket.token}) as No-Show? This releases their spot.`)) {
      return;
    }

    setErrorMessage(null);
    try {
      const res = await fetch(apiEndpoint(`/api/queue/ticket/${ticket.id}/noshow`), { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Customer ${ticket.token} marked as No-Show.`);
        fetchDashboardData();
      } else {
        setErrorMessage(data.error || 'Failed to mark customer as No-show.');
      }
    } catch {
      setErrorMessage('Network error marking No-show.');
    }
  };

  // Handle Cancel Ticket
  const handleCancelTicket = async (ticket: QueueItem) => {
    if (!window.confirm(`Are you sure you want to cancel token ${ticket.token} (${ticket.customer_name})?`)) {
      return;
    }

    setErrorMessage(null);
    try {
      const res = await fetch(apiEndpoint(`/api/queue/ticket/${ticket.id}/cancel`), { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Ticket ${ticket.token} was successfully cancelled.`);
        fetchDashboardData();
      } else {
        setErrorMessage(data.error || 'Failed to cancel ticket.');
      }
    } catch {
      setErrorMessage('Network error cancelling ticket.');
    }
  };

  // Handle Walk-In Form Submission
  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setActionMessage(null);

    if (walkinName.trim().length < 2) {
      setErrorMessage('Please enter a valid customer name (at least 2 characters).');
      return;
    }

    const cleanPhone = walkinPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    if (walkinServices.length < 1 || walkinServices.length > 3) {
      setErrorMessage('Please select between 1 and 3 services.');
      return;
    }

    setSubmittingWalkin(true);

    try {
      const res = await fetch(apiEndpoint('/api/queue/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: walkinName.trim(),
          phone: cleanPhone,
          serviceIds: walkinServices,
          preferredBarber: walkinBarber,
          isWalkIn: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to add walk-in customer.');
      } else {
        setActionMessage(`Walk-in customer ${data.ticket.customer_name} added to queue (Token: ${data.ticket.token}).`);
        setWalkinName('');
        setWalkinPhone('');
        fetchDashboardData();
      }
    } catch {
      setErrorMessage('Network error adding walk-in customer.');
    } finally {
      setSubmittingWalkin(false);
    }
  };

  const waitingOnly = queue.filter((q) => q.status === 'Waiting');
  const inServiceCount = queue.filter((q) => q.status === 'In Chair' || q.status === 'Called').length;
  const overdueCustomer = queue.find((q) => q.isOverdue);

  return (
    <div className="space-y-6 animate-fadeIn text-salon-text">
      {/* Header & Quick Stat Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-salon-border">
        <div>
          <span className="text-xs font-bold text-salon-secondary uppercase tracking-wider">Screen 4</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-salon-primary mt-0.5">
            {t('reception.title')}
          </h1>
          <p className="text-xs sm:text-sm text-salon-muted mt-1">{t('reception.subtitle')}</p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-salon-card border border-salon-border flex items-center space-x-2 shadow-sm">
            <span className="text-salon-muted">{t('reception.stat_waiting')}:</span>
            <span className="text-base font-black text-salon-primary">{waitingOnly.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-salon-card border border-salon-border flex items-center space-x-2 shadow-sm">
            <span className="text-salon-muted">{t('reception.stat_in_chair')}:</span>
            <span className="text-base font-black text-emerald-700">{inServiceCount}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-salon-card border border-salon-border flex items-center space-x-2 shadow-sm">
            <span className="text-salon-muted">{t('reception.stat_barbers')}:</span>
            <span className="text-base font-black text-salon-primary">
              {barbers.filter((b) => b.is_on_duty && !b.is_on_break).length}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Feedback Toasts */}
      {actionMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex items-center space-x-3 text-xs text-emerald-900 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-300 p-4 flex items-center space-x-3 text-xs text-red-900 shadow-sm animate-shake">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* High Wait Delay Alert Banner (>60 Mins) */}
      {overdueCustomer && (
        <div className="rounded-xl bg-red-50 border-2 border-red-300 p-4 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center space-x-3 text-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 animate-pulse" />
            <span>
              <strong className="font-bold">{t('reception.high_wait_alert')}:</strong>{' '}
              {overdueCustomer.customer_name} (Token: {overdueCustomer.token}) has been waiting for{' '}
              <strong className="text-red-700">{overdueCustomer.elapsedMinutes} mins</strong>!
            </span>
          </div>
        </div>
      )}

      {/* Active Barber Chairs Grid */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-salon-muted uppercase tracking-wider flex items-center space-x-2">
          <Scissors className="w-4 h-4 text-salon-secondary" />
          <span>{t('reception.chairs_title')}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {barbers.map((barber) => {
            const hasCustomer = !!barber.currentCustomer;
            const isBreak = barber.is_on_break === 1;

            return (
              <div
                key={barber.id}
                className="bg-salon-card border border-salon-border rounded-xl p-4 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-salon-border">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-salon-primary">{barber.name}</span>
                      <span className="text-[10px] text-salon-muted">({barber.chair})</span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isBreak
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : hasCustomer
                          ? 'bg-amber-50 text-salon-primary border border-salon-accent'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isBreak ? 'On Break' : hasCustomer ? barber.currentCustomer?.status : 'Chair Open'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-salon-muted">{t('reception.serving_label')}</span>
                      <span className="font-bold text-salon-primary truncate max-w-[140px]">
                        {barber.currentCustomer
                          ? `${barber.currentCustomer.token} - ${barber.currentCustomer.customer_name}`
                          : 'Vacant'}
                      </span>
                    </div>
                    {barber.currentCustomer && (
                      <div className="flex justify-between text-salon-muted">
                        <span>Service:</span>
                        <span className="text-salon-text truncate max-w-[140px]">
                          {barber.currentCustomer.services}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isBreak || hasCustomer || callingBarberId === barber.id}
                  onClick={() => handleCallNext(barber.id)}
                  className="mt-4 w-full py-2.5 rounded-lg bg-salon-primary text-salon-card font-extrabold text-xs hover:bg-salon-primary-hover transition duration-150 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {callingBarberId === barber.id
                    ? 'Calling...'
                    : hasCustomer
                    ? 'Chair Occupied'
                    : isBreak
                    ? 'On Break'
                    : t('reception.call_next_btn')}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-Panel Operational Workspace: Queue Table (65%) + Walk-In Form (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Waiting Customer Table (7 Cols) */}
        <div className="lg:col-span-8 bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-salon-primary flex items-center space-x-2">
              <Users className="w-4 h-4 text-salon-secondary" />
              <span>{t('reception.queue_table_title')}</span>
            </h2>
            <span className="text-xs text-salon-muted">{queue.length} Total Registered</span>
          </div>

          {loading ? (
            <p className="text-xs text-salon-muted py-8 text-center">Loading live queue records...</p>
          ) : queue.length === 0 ? (
            <div className="py-12 text-center text-xs text-salon-muted space-y-2">
              <Users className="w-8 h-8 text-salon-border mx-auto" />
              <p>No customers currently in queue. Add walk-in clients using the form.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-salon-bg text-salon-muted uppercase tracking-wider text-[10px] border-b border-salon-border">
                  <tr>
                    <th className="py-2.5 px-3">{t('reception.col_token')}</th>
                    <th className="py-2.5 px-3">{t('reception.col_customer')}</th>
                    <th className="py-2.5 px-3">{t('reception.col_services')}</th>
                    <th className="py-2.5 px-3">{t('reception.col_barber')}</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">{t('reception.col_wait')}</th>
                    <th className="py-2.5 px-3 text-right">{t('reception.col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-salon-border text-salon-text">
                  {queue.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-salon-bg/70 transition ${
                        item.isOverdue
                          ? 'bg-red-50/70 border-l-4 border-red-500'
                          : item.status === 'Called'
                          ? 'bg-amber-50/50'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-salon-primary">{item.token}</td>
                      <td className="py-3 px-3 font-medium text-salon-text">
                        <div>{item.customer_name}</div>
                        <div className="text-[10px] text-salon-muted">{item.phone}</div>
                      </td>
                      <td className="py-3 px-3 text-salon-muted">
                        {item.services.map((s) => s.name_en).join(', ') || 'Service'}
                      </td>
                      <td className="py-3 px-3 text-salon-muted">
                        {item.assignedBarberName || item.preferredBarberName}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'Waiting'
                              ? 'bg-salon-accent-light text-salon-primary'
                              : item.status === 'Called'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold">
                        <span className={item.isOverdue ? 'text-red-700 font-extrabold' : 'text-salon-text'}>
                          ~{item.estimatedWaitTime}m
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleNoShow(item)}
                          title="Mark Customer as No-Show"
                          className="px-2 py-1 rounded bg-salon-bg border border-salon-border hover:border-amber-400 text-salon-muted hover:text-amber-700 text-[10px] font-semibold transition"
                        >
                          <UserX className="w-3 h-3 inline mr-1" />
                          {t('reception.btn_noshow')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelTicket(item)}
                          title="Cancel Customer Spot"
                          className="px-2 py-1 rounded bg-salon-bg border border-salon-border hover:border-red-400 text-salon-muted hover:text-red-600 text-[10px] font-semibold transition"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          {t('reception.btn_cancel')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Panel: Add Walk-In Form (4 Cols) */}
        <div className="lg:col-span-4 bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-salon-primary flex items-center space-x-2 pb-3 border-b border-salon-border">
            <Plus className="w-4 h-4 text-salon-secondary" />
            <span>{t('reception.walkin_title')}</span>
          </h2>

          <form onSubmit={handleWalkinSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-salon-text mb-1">{t('join.name_label')} *</label>
              <input
                type="text"
                required
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="Client Name"
                className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-salon-text mb-1">
                {t('join.phone_label')} (10 Digits) *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile"
                className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-salon-text mb-1">
                Services (1-3 Selected: {walkinServices.length})
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {services.map((s) => {
                  const isChecked = walkinServices.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-[11px] transition ${
                        isChecked ? 'bg-salon-accent-light/50 border-salon-primary' : 'bg-salon-bg border-salon-border'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (walkinServices.length > 1) {
                                setWalkinServices(walkinServices.filter((id) => id !== s.id));
                              }
                            } else {
                              if (walkinServices.length < 3) {
                                setWalkinServices([...walkinServices, s.id]);
                              }
                            }
                          }}
                          className="rounded text-salon-primary focus:ring-salon-primary"
                        />
                        <span className="font-medium text-salon-text">
                          {language === 'gu' ? s.name_gu : s.name_en}
                        </span>
                      </div>
                      <span className="text-salon-primary font-bold">₹{s.price}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-salon-text mb-1">Assign Barber</label>
              <select
                value={walkinBarber}
                onChange={(e) => setWalkinBarber(e.target.value)}
                className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
              >
                <option value="any">Any Barber (Fastest)</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.chair}) {b.is_on_break ? '- On Break' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submittingWalkin}
              className="w-full mt-4 py-3 rounded-xl bg-salon-primary text-salon-card font-extrabold text-xs hover:bg-salon-primary-hover transition duration-150 shadow disabled:opacity-60"
            >
              {submittingWalkin ? 'Adding...' : t('reception.add_walkin_btn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
