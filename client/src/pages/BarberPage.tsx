import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Play, CheckCircle2, Coffee, Scissors, Users, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';
import { apiEndpoint } from '../lib/api';

interface Service {
  id: number;
  name_en: string;
  name_gu: string;
  duration: number;
  price: number;
}

interface BarberData {
  id: string;
  name: string;
  chair: string;
  specialization: string;
  is_on_duty: number;
  is_on_break: number;
  status: 'available' | 'busy' | 'break' | 'off';
}

interface CurrentCustomer {
  id: string;
  token: string;
  customer_name: string;
  phone: string;
  status: 'Called' | 'In Chair';
  total_duration: number;
  total_price: number;
  started_at: string | null;
  elapsedSeconds: number;
  services: Service[];
}

interface UpNextCustomer {
  id: string;
  token: string;
  customer_name: string;
  phone: string;
  total_duration: number;
  services: Service[];
  elapsedMinutes: number;
}

export const BarberPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const { t, language } = useLanguage();
  const { socket } = useSocket();

  const barberParam = name || 'vikram';

  // Live Station State
  const [barber, setBarber] = useState<BarberData | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<CurrentCustomer | null>(null);
  const [upNext, setUpNext] = useState<UpNextCustomer[]>([]);
  const [totalWaiting, setTotalWaiting] = useState(0);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Timer State (Stopwatch for In Chair)
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Confirmation Modals
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStationData = async () => {
    try {
      const res = await fetch(apiEndpoint(`/api/queue/barber/${barberParam}`));
      if (!res.ok) {
        if (res.status === 404) setNotFound(true);
        return;
      }
      const data = await res.json();
      setBarber(data.barber);
      setCurrentCustomer(data.currentCustomer);
      setUpNext(data.upNext || []);
      setTotalWaiting(data.totalWaitingCount || 0);

      if (data.currentCustomer && data.currentCustomer.status === 'In Chair') {
        setTimerSeconds(data.currentCustomer.elapsedSeconds || 0);
      } else {
        setTimerSeconds(0);
      }
      setNotFound(false);
    } catch (err) {
      console.error('Failed to load barber station:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStationData();

    if (socket) {
      socket.on('queue:updated', () => {
        fetchStationData();
      });

      return () => {
        socket.off('queue:updated');
      };
    }
  }, [barberParam, socket]);

  // Live Stopwatch ticker when In Chair
  useEffect(() => {
    if (!currentCustomer || currentCustomer.status !== 'In Chair') return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentCustomer]);

  // Handle Toggle Break Status
  const handleToggleBreak = async (breakVal: boolean) => {
    if (!barber) return;
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const res = await fetch(apiEndpoint(`/api/salon/barbers/${barber.id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_on_break: breakVal ? 1 : 0 })
      });
      if (res.ok) {
        setActionMessage(breakVal ? 'Station marked On Break.' : 'Station is now Available.');
        fetchStationData();
      }
    } catch {
      setErrorMessage('Failed to update station break status.');
    }
  };

  // Handle Start Service
  const handleStartService = async () => {
    if (!currentCustomer) return;
    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const res = await fetch(apiEndpoint(`/api/queue/ticket/${currentCustomer.id}/start`), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to start service.');
      } else {
        setActionMessage(data.message);
        fetchStationData();
      }
    } catch {
      setErrorMessage('Network error starting service.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Done Service
  const handleDoneService = async () => {
    if (!currentCustomer) return;
    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const res = await fetch(apiEndpoint(`/api/queue/ticket/${currentCustomer.id}/done`), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to complete service.');
      } else {
        setActionMessage(data.message);
        setShowDoneModal(false);
        fetchStationData();
      }
    } catch {
      setErrorMessage('Network error completing service.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Call Next from Chair
  const handleCallNext = async () => {
    if (!barber) return;
    setActionLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const res = await fetch(apiEndpoint('/api/queue/call-next'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId: barber.id })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'No eligible customer waiting.');
      } else {
        setActionMessage(data.message);
        fetchStationData();
      }
    } catch {
      setErrorMessage('Network error calling next customer.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3 animate-pulse text-salon-text">
        <Clock className="w-8 h-8 animate-spin mx-auto text-salon-secondary" />
        <p className="text-sm font-bold text-salon-muted">Connecting to barber station...</p>
      </div>
    );
  }

  if (notFound || !barber) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 bg-salon-card border border-salon-border rounded-2xl text-center space-y-4 shadow-sm text-salon-text">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-salon-primary">Stylist Not Found</h2>
        <p className="text-xs text-salon-muted">
          No stylist station found matching &quot;{barberParam}&quot;.
        </p>
        <Link
          to="/"
          className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-salon-primary text-salon-card font-bold text-xs"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const expectedTotalSeconds = (currentCustomer?.total_duration || 30) * 60;
  const progressPercent = Math.min(100, Math.round((timerSeconds / expectedTotalSeconds) * 100));
  const remainingMins = Math.max(0, Math.ceil((expectedTotalSeconds - timerSeconds) / 60));

  const isOnBreak = barber.is_on_break === 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn text-salon-text">
      {/* Top Breadcrumb Link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-salon-muted hover:text-salon-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Salon Home</span>
        </Link>
      </div>

      {/* Barber Station Header */}
      <div className="bg-salon-card border border-salon-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-salon-bg border border-salon-secondary/30 flex items-center justify-center text-salon-primary font-bold text-lg">
            {barber.name[0]}
          </div>
          <div>
            <span className="text-xs font-semibold text-salon-secondary uppercase tracking-wider">
              {barber.chair} • {barber.specialization}
            </span>
            <h1 className="text-2xl font-black text-salon-primary">
              {barber.name}
            </h1>
            <p className="text-xs text-salon-muted">Station Active • The Royal Cut Salon</p>
          </div>
        </div>

        {/* Available vs On Break Toggle */}
        <div className="flex items-center space-x-2 bg-salon-bg p-1.5 rounded-xl border border-salon-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleToggleBreak(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              !isOnBreak ? 'bg-emerald-700 text-white shadow-sm' : 'text-salon-muted hover:text-salon-primary'
            }`}
          >
            Available
          </button>
          <button
            type="button"
            onClick={() => handleToggleBreak(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              isOnBreak ? 'bg-amber-600 text-white shadow-sm' : 'text-salon-muted hover:text-salon-primary'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>On Break</span>
          </button>
        </div>
      </div>

      {/* Action / Error Alerts */}
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

      {/* Main Focus Card: Currently Serving */}
      <div className="bg-salon-card border-2 border-salon-secondary/40 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-salon-border">
          <div className="flex items-center space-x-2">
            <Scissors className="w-5 h-5 text-salon-primary" />
            <span className="text-sm font-extrabold uppercase tracking-wider text-salon-primary">
              {t('barber.currently_serving')}
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              !currentCustomer
                ? 'bg-salon-bg text-salon-muted border border-salon-border'
                : currentCustomer.status === 'In Chair'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-black'
                : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
            }`}
          >
            {!currentCustomer ? 'Chair Vacant' : currentCustomer.status === 'In Chair' ? 'In Chair' : 'Called to Chair'}
          </span>
        </div>

        {currentCustomer ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Customer Details */}
            <div>
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl sm:text-5xl font-black text-salon-primary font-mono">
                  {currentCustomer.token}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-salon-text">{currentCustomer.customer_name}</h2>
                  <p className="text-xs text-salon-muted">+91 {currentCustomer.phone}</p>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-salon-bg border border-salon-border text-xs space-y-1.5">
                <span className="font-bold text-salon-primary uppercase tracking-wider text-[10px]">
                  Services Requested ({currentCustomer.total_duration} mins • ₹{currentCustomer.total_price})
                </span>
                <p className="text-sm font-semibold text-salon-text">
                  {currentCustomer.services.map((s) => (language === 'gu' ? s.name_gu : s.name_en)).join(' + ')}
                </p>
                <p className="text-salon-muted">
                  Status: <strong>{currentCustomer.status}</strong>
                  {currentCustomer.status === 'Called' && ' — Awaiting client arrival at chair.'}
                </p>
              </div>
            </div>

            {/* Service Stopwatch / Countdown Timer */}
            <div className="text-center p-6 bg-salon-bg rounded-xl border border-salon-border flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-widest text-salon-muted flex items-center space-x-1.5 mb-2">
                <Clock className="w-4 h-4 text-salon-primary" />
                <span>{t('barber.service_timer')}</span>
              </span>
              <div className="text-5xl font-black font-mono text-salon-primary tracking-wider">
                {currentCustomer.status === 'In Chair' ? formatTimer(timerSeconds) : '00:00'}
              </div>
              <p className="text-xs text-salon-muted mt-1">
                {currentCustomer.status === 'In Chair'
                  ? `Expected: ${currentCustomer.total_duration}:00 (~${remainingMins} mins remaining)`
                  : 'Timer starts when client arrives and you click "Start Service"'}
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-salon-border rounded-full h-2.5 mt-4 overflow-hidden">
                <div
                  className="bg-salon-primary h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-salon-muted space-y-3">
            <Scissors className="w-10 h-10 text-salon-border mx-auto" />
            <h3 className="text-base font-bold text-salon-primary">Chair is currently empty</h3>
            <p className="text-xs max-w-sm mx-auto">
              Ready for the next customer in line. Tap &quot;Call Next Customer&quot; to page the earliest waiting client.
            </p>
          </div>
        )}

        {/* Primary Controls: Start and Done */}
        <div className="mt-8 pt-6 border-t border-salon-border flex flex-col sm:flex-row gap-3">
          {currentCustomer ? (
            <>
              {currentCustomer.status === 'Called' ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleStartService}
                  className="flex-1 py-4 rounded-xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 transition duration-150 flex items-center justify-center space-x-2 shadow-md disabled:opacity-60"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{actionLoading ? 'Starting...' : t('barber.btn_start')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-4 rounded-xl bg-salon-bg border border-salon-border text-salon-muted font-bold text-sm cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Service in Progress</span>
                </button>
              )}

              <button
                type="button"
                disabled={currentCustomer.status !== 'In Chair' || actionLoading}
                onClick={() => setShowDoneModal(true)}
                className="flex-1 py-4 rounded-xl bg-salon-primary text-salon-card font-extrabold text-sm hover:bg-salon-primary-hover transition duration-150 flex items-center justify-center space-x-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{t('barber.btn_done')}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isOnBreak || actionLoading}
              onClick={handleCallNext}
              className="w-full py-4 rounded-xl bg-salon-primary text-salon-card font-extrabold text-sm hover:bg-salon-primary-hover transition duration-150 flex items-center justify-center space-x-2 shadow-md disabled:opacity-50"
            >
              <Scissors className="w-5 h-5" />
              <span>{actionLoading ? 'Calling...' : 'Call Next Customer to Chair'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Up Next Card */}
      {upNext.length > 0 ? (
        <div className="bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-salon-bg border border-salon-border flex items-center justify-center text-salon-primary font-black font-mono text-xl">
              {upNext[0].token}
            </div>
            <div>
              <span className="text-xs font-bold text-salon-muted uppercase tracking-wider">
                {t('barber.up_next_title')}
              </span>
              <h3 className="text-base font-bold text-salon-primary">{upNext[0].customer_name}</h3>
              <p className="text-xs text-salon-muted">
                {upNext[0].services.map((s) => s.name_en).join(', ')} • Waiting for {upNext[0].elapsedMinutes} mins
              </p>
            </div>
          </div>

          <span className="text-xs text-salon-muted hidden sm:block">
            {totalWaiting} {t('barber.chair_queue_count')}
          </span>
        </div>
      ) : (
        <div className="bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm flex items-center justify-between text-xs text-salon-muted">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-salon-secondary" />
            <span>No upcoming customers waiting specifically for your chair right now.</span>
          </div>
          <span>0 in line</span>
        </div>
      )}

      {/* Completion Safety Modal */}
      {showDoneModal && currentCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-salon-card border border-salon-border max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 text-salon-text">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-salon-primary">Complete Service?</h3>
              <p className="text-xs text-salon-muted mt-2 leading-relaxed">
                Confirm completion of grooming services for <strong>{currentCustomer.customer_name} ({currentCustomer.token})</strong>. This will release the chair for the next client.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDoneModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-salon-border text-xs font-bold text-salon-muted hover:bg-salon-bg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDoneService}
                className="flex-1 py-2.5 rounded-xl bg-salon-primary text-salon-card text-xs font-extrabold hover:bg-salon-primary-hover transition shadow-sm disabled:opacity-60"
              >
                {actionLoading ? 'Completing...' : 'Yes, Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
