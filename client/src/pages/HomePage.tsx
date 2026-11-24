import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, ArrowRight, Scissors, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';

interface SalonStatus {
  isOpen: boolean;
  waitingCount: number;
  inChairCount: number;
  workingBarbersCount: number;
  estimatedWaitTime: number;
}

interface Barber {
  id: string;
  name: string;
  chair: string;
  specialization: string;
  is_on_duty: number;
  is_on_break: number;
  queueDepth: number;
  status: 'available' | 'busy' | 'break' | 'off';
}

export const HomePage: React.FC = () => {
  const { t } = useLanguage();
  const { socket } = useSocket();

  const [status, setStatus] = useState<SalonStatus>({
    isOpen: true,
    waitingCount: 0,
    inChairCount: 0,
    workingBarbersCount: 3,
    estimatedWaitTime: 0,
  });

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveStatus = async () => {
    try {
      const [statusRes, barbersRes] = await Promise.all([
        fetch('/api/salon/status'),
        fetch('/api/salon/barbers')
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
      if (barbersRes.ok) {
        const barbersData = await barbersRes.json();
        setBarbers(barbersData);
      }
    } catch (err) {
      console.error('Failed to fetch live salon status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();

    // Listen for real-time queue mutations
    if (socket) {
      socket.on('queue:updated', () => {
        fetchLiveStatus();
      });

      return () => {
        socket.off('queue:updated');
      };
    }
  }, [socket]);

  return (
    <div className="space-y-8 animate-fadeIn text-salon-text">
      {/* Hero Welcome & Queue Summary Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-salon-card border border-salon-border p-6 sm:p-8 lg:p-10 shadow-sm">
        <div className="max-w-3xl">
          <div className="flex items-center space-x-2 mb-4">
            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-salon-accent-light text-salon-primary border border-salon-accent">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('home.welcome_badge')}</span>
            </span>
            {!status.isOpen && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t('queue_closed')}</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-salon-primary tracking-tight">
            {t('salon_name')}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-salon-muted leading-relaxed">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Live Queue Metrics Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Waiting Metric Card */}
          <div className="bg-salon-bg border border-salon-border rounded-xl p-5 flex items-center space-x-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-salon-card border border-salon-border flex items-center justify-center text-salon-primary flex-shrink-0 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-salon-muted font-semibold">
                {t('home.waiting_count')}
              </p>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-salon-primary">
                  {loading ? '...' : status.waitingCount}
                </span>
                <span className="text-xs text-salon-secondary font-bold">{t('home.in_line')}</span>
              </div>
            </div>
          </div>

          {/* Estimated Wait Time Metric Card */}
          <div className="bg-salon-bg border border-salon-border rounded-xl p-5 flex items-center space-x-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-salon-card border border-salon-border flex items-center justify-center text-salon-primary flex-shrink-0 shadow-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-salon-muted font-semibold">
                {t('home.est_wait')}
              </p>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-salon-primary">
                  {loading ? '...' : status.waitingCount === 0 ? '0' : `~${status.estimatedWaitTime}`}
                </span>
                <span className="text-xs text-salon-secondary font-bold">{t('home.wait_unit')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          {status.isOpen ? (
            <Link
              to="/join"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-xl bg-salon-primary text-salon-card font-extrabold text-base hover:bg-salon-primary-hover transition duration-150 shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{t('home.join_cta')}</span>
              <ArrowRight className="w-5 h-5 text-salon-accent" />
            </Link>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-xl bg-gray-300 text-gray-600 font-extrabold text-base cursor-not-allowed opacity-80"
            >
              <span>{t('home.queue_closed_cta')}</span>
            </button>
          )}

          <span className="text-xs text-salon-muted flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Select services & choose your stylist</span>
          </span>
        </div>
      </div>

      {/* Barbers on Floor Roster Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 pb-2 border-b border-salon-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-salon-primary tracking-tight flex items-center space-x-2">
              <Scissors className="w-5 h-5 text-salon-secondary" />
              <span>{t('home.barbers_title')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-salon-muted">
              {t('home.barbers_subtitle')}
            </p>
          </div>
          <span className="text-xs text-salon-secondary font-bold">
            {barbers.filter((b) => b.is_on_duty && !b.is_on_break).length} Stylists Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="bg-salon-card border border-salon-border hover:border-salon-secondary rounded-xl p-5 transition duration-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-salon-bg text-salon-primary border border-salon-border">
                    {barber.chair}
                  </span>

                  {/* Status Badges */}
                  {barber.is_on_break === 1 ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>{t('home.status.break')}</span>
                    </span>
                  ) : barber.is_on_duty === 1 ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{t('home.status.available')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                      <span>Off Duty</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 mt-2">
                  <div className="w-11 h-11 rounded-full bg-salon-bg border border-salon-border flex items-center justify-center text-salon-primary font-bold text-sm">
                    {barber.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-salon-primary">
                      {barber.name}
                    </h3>
                    <p className="text-xs text-salon-muted">{barber.specialization}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-salon-border flex items-center justify-between text-xs">
                <span className="text-salon-muted">
                  {barber.queueDepth > 0 ? `${barber.queueDepth} in line` : 'No wait'}
                </span>
                <Link
                  to={`/barber/${barber.id}`}
                  className="text-salon-primary hover:text-salon-secondary font-bold hover:underline"
                >
                  View Station &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
