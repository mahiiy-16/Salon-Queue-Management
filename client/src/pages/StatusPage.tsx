import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, Bell, ArrowLeft, Scissors, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';

interface ServiceItem {
  id: number;
  name_en: string;
  name_gu: string;
  duration: number;
  price: number;
}

interface TicketData {
  id: string;
  token: string;
  customer_name: string;
  phone: string;
  status: 'Waiting' | 'Called' | 'In Chair' | 'Done' | 'Cancelled' | 'No-show';
  preferred_barber: string;
  total_duration: number;
  total_price: number;
  barberName: string;
  position: number;
  estimatedWaitTime: number;
  isStartComing: boolean;
  isYourTurn: boolean;
  services: ServiceItem[];
}

export const StatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { socket } = useSocket();

  // Read ticket ID from route param or fallback to localStorage
  const activeTicketId = id || localStorage.getItem('salon_active_ticket_id') || 'S-14';

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchTicketDetails = async () => {
    try {
      const res = await fetch(`/api/queue/ticket/${activeTicketId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(true);
        }
        return;
      }
      const data: TicketData = await res.json();
      setTicket(data);
      setNotFound(false);
    } catch (err) {
      console.error('Failed to fetch ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();

    // Listen to real-time events to auto-update ticket position and wait time
    if (socket) {
      socket.on('queue:updated', () => {
        fetchTicketDetails();
      });

      return () => {
        socket.off('queue:updated');
      };
    }
  }, [activeTicketId, socket]);

  const handleCancelTicket = async () => {
    if (!ticket) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/queue/ticket/${ticket.id}/cancel`, {
        method: 'POST'
      });
      if (res.ok) {
        setShowCancelModal(false);
        fetchTicketDetails();
      }
    } catch (err) {
      console.error('Failed to cancel ticket:', err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3 animate-pulse text-salon-text">
        <div className="w-12 h-12 rounded-full bg-salon-accent-light text-salon-primary mx-auto flex items-center justify-center">
          <Clock className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-bold text-salon-muted">Loading live queue status...</p>
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 bg-salon-card border border-salon-border rounded-2xl text-center space-y-4 shadow-sm text-salon-text">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-salon-primary">Ticket Not Found</h2>
        <p className="text-xs text-salon-muted leading-relaxed">
          The requested token link may have expired or is invalid. Please join the queue to reserve your spot.
        </p>
        <Link
          to="/join"
          className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-salon-primary text-salon-card font-bold text-xs hover:bg-salon-primary-hover shadow-sm"
        >
          Join Queue Now
        </Link>
      </div>
    );
  }

  const isTerminal = ticket.status === 'Cancelled' || ticket.status === 'Done' || ticket.status === 'No-show';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn text-salon-text">
      {/* Back Link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-salon-muted hover:text-salon-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Main Status Board Container */}
      <div className="bg-salon-card border-2 border-salon-accent rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        {/* Top Header & Live Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-salon-border">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-salon-secondary">
              {t('status.title')}
            </span>
            <p className="text-xs text-salon-muted mt-0.5">{t('status.subtitle')}</p>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync Active</span>
          </span>
        </div>

        {/* Hero Token Identifier */}
        <div className="mt-6 text-center py-6 bg-salon-bg rounded-xl border border-salon-border">
          <p className="text-xs font-semibold text-salon-muted uppercase tracking-widest">
            {t('status.token_label')}
          </p>
          <h1 className="text-5xl sm:text-6xl font-black text-salon-primary tracking-tight mt-1 font-mono">
            {ticket.token}
          </h1>
          <p className="text-sm font-semibold text-salon-text mt-2">
            {ticket.customer_name} •{' '}
            <span
              className={`font-bold ${
                ticket.status === 'Waiting'
                  ? 'text-emerald-700'
                  : ticket.status === 'Called'
                  ? 'text-amber-700 font-extrabold'
                  : ticket.status === 'In Chair'
                  ? 'text-salon-primary font-black'
                  : 'text-salon-muted'
              }`}
            >
              {ticket.status === 'Waiting' ? 'Waiting in Line' : ticket.status}
            </span>
          </p>
        </div>

        {/* Proactive Notification Banner: "It's Your Turn!" (When status is Called) */}
        {ticket.isYourTurn && (
          <div className="mt-6 rounded-xl bg-emerald-50 border-2 border-emerald-400 p-5 flex items-start space-x-3.5 shadow-md animate-bounce">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-emerald-900">
                {t('status.alert_your_turn_title')}
              </h3>
              <p className="text-xs text-emerald-800 mt-1 font-medium">
                Please proceed directly to the chair: <strong>{ticket.barberName}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Proactive Notification Banner: "Start Coming!" (When at Position #2) */}
        {ticket.isStartComing && (
          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-400 p-4 flex items-start space-x-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {t('status.alert_start_coming_title')}
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 font-medium">
                {t('status.alert_start_coming_desc')}
              </p>
            </div>
          </div>
        )}

        {/* Real-time Queue Stats Row */}
        {!isTerminal && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-salon-bg p-3.5 rounded-xl border border-salon-border">
              <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">
                {t('status.position_label')}
              </p>
              <p className="text-2xl font-black text-salon-primary mt-0.5">#{ticket.position}</p>
              <span className="text-[10px] text-salon-secondary font-bold">{t('status.position_val')}</span>
            </div>

            <div className="bg-salon-bg p-3.5 rounded-xl border border-salon-border">
              <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">
                {t('status.wait_label')}
              </p>
              <p className="text-2xl font-black text-salon-primary mt-0.5">~{ticket.estimatedWaitTime}</p>
              <span className="text-[10px] text-salon-secondary font-bold">{t('home.wait_unit')}</span>
            </div>

            <div className="bg-salon-bg p-3.5 rounded-xl border border-salon-border col-span-2 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">
                {t('status.barber_label')}
              </p>
              <p className="text-sm font-bold text-salon-primary mt-1 truncate">{ticket.barberName}</p>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {ticket.preferred_barber === 'any' ? 'First Available' : 'Preferred Stylist'}
              </span>
            </div>
          </div>
        )}

        {/* Terminal Alert (Cancelled / Done / No-Show) */}
        {ticket.status === 'Cancelled' && (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-center text-xs text-red-800 font-medium">
            This queue ticket has been cancelled. You can join the queue again at any time.
          </div>
        )}
        {ticket.status === 'Done' && (
          <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            Service complete! Thank you for visiting {t('salon_name')}.
          </div>
        )}

        {/* Selected Services Breakdown */}
        <div className="mt-6 p-4 rounded-xl bg-salon-bg border border-salon-border text-xs space-y-2">
          <span className="font-bold text-salon-primary uppercase tracking-wider text-[11px]">
            {t('status.services_label')}
          </span>
          <div className="space-y-1.5 pt-1">
            {ticket.services && ticket.services.length > 0 ? (
              ticket.services.map((s) => (
                <div key={s.id} className="flex justify-between text-salon-muted">
                  <span>{language === 'gu' ? s.name_gu : s.name_en} ({s.duration}m)</span>
                  <span className="font-bold text-salon-primary">₹{s.price}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-salon-muted">
                <span>Total Booked Services ({ticket.total_duration} mins)</span>
                <span className="font-bold text-salon-primary">₹{ticket.total_price}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button: Cancel My Spot */}
        {!isTerminal && (
          <div className="mt-6 pt-4 border-t border-salon-border flex justify-end">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-bold px-4 py-2.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition"
            >
              {t('status.cancel_btn')}
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-salon-card border border-salon-border max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 text-salon-text">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-salon-primary">Cancel Queue Spot</h3>
              <p className="text-xs text-salon-muted mt-2 leading-relaxed">
                {t('status.cancel_confirm_msg')}
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-salon-border text-xs font-bold text-salon-muted hover:bg-salon-bg transition"
              >
                {t('status.cancel_no')}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelTicket}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition shadow-sm disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : t('status.cancel_yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
