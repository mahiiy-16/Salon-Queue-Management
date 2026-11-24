import React, { useState, useEffect, useRef } from 'react';
import { Scissors, Users, Maximize, CheckCircle2 } from 'lucide-react';
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

interface Barber {
  id: string;
  name: string;
  chair: string;
  specialization: string;
  is_on_duty: number;
  is_on_break: number;
  status: 'available' | 'busy' | 'break' | 'off';
}

interface QueueTicket {
  id: string;
  token: string;
  customer_name: string;
  phone: string;
  preferred_barber: string;
  assigned_barber: string | null;
  services: Service[];
  preferredBarberName: string;
  assignedBarberName: string | null;
  total_duration: number;
  total_price: number;
  status: 'Waiting' | 'Called' | 'In Chair';
  position: number;
  estimatedWaitTime: number;
  elapsedMinutes: number;
  called_at?: string | null;
  started_at?: string | null;
}

interface NowServingChair {
  chair: string;
  barber: string;
  barberId: string;
  token: string | null;
  client: string;
  service: string;
  status: 'In Chair' | 'Called' | 'Chair Open' | 'On Break';
  isCalledFlash?: boolean;
}

export const DisplayPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { socket } = useSocket();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeTickets, setActiveTickets] = useState<QueueTicket[]>([]);
  const [flashingToken, setFlashingToken] = useState<string | null>(null);
  const flashTimeoutRef = useRef<any>(null);

  // Digital Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDisplayData = async () => {
    try {
      const [queueRes, barbersRes] = await Promise.all([
        fetch(apiEndpoint('/api/queue/all')),
        fetch(apiEndpoint('/api/salon/barbers'))
      ]);

      if (queueRes.ok) {
        const qData: QueueTicket[] = await queueRes.json();
        setActiveTickets(qData);
      }
      if (barbersRes.ok) {
        const bData: Barber[] = await barbersRes.json();
        setBarbers(bData);
      }
    } catch (err) {
      console.error('Failed to load waiting area TV data:', err);
    }
  };

  // Play polite arrival chime for TV when a customer is called
  const playArrivalChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  useEffect(() => {
    fetchDisplayData();

    if (socket) {
      socket.on('queue:updated', (event: any) => {
        fetchDisplayData();

        // 10-Second Visual Gold Flash on Called Token
        if (event && event.type === 'CUSTOMER_CALLED' && event.token) {
          setFlashingToken(event.token);
          playArrivalChime();

          if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = setTimeout(() => {
            setFlashingToken(null);
          }, 10000); // 10 seconds per spec
        }
      });

      return () => {
        socket.off('queue:updated');
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      };
    }
  }, [socket]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 1. Build "NOW SERVING" section from active barbers on duty
  const nowServingChairs: NowServingChair[] = barbers
    .filter((b) => b.is_on_duty === 1)
    .map((b) => {
      // Find ticket assigned to this chair that is In Chair or Called
      const activeForChair = activeTickets.find(
        (t) => t.assigned_barber === b.id && (t.status === 'In Chair' || t.status === 'Called')
      );

      if (b.is_on_break === 1) {
        return {
          chair: b.chair,
          barber: b.name,
          barberId: b.id,
          token: null,
          client: 'Station on Break',
          service: 'Stylist temporarily unavailable',
          status: 'On Break'
        };
      }

      if (activeForChair) {
        const clientFirstName = activeForChair.customer_name.split(' ')[0] +
          (activeForChair.customer_name.split(' ')[1] ? ` ${activeForChair.customer_name.split(' ')[1][0]}.` : '');

        const serviceNames = activeForChair.services && activeForChair.services.length > 0
          ? activeForChair.services.map((s) => (language === 'gu' ? s.name_gu : s.name_en)).join(' + ')
          : 'Styling & Grooming';

        return {
          chair: b.chair,
          barber: b.name,
          barberId: b.id,
          token: activeForChair.token,
          client: clientFirstName,
          service: serviceNames,
          status: activeForChair.status as any,
          isCalledFlash: flashingToken === activeForChair.token
        };
      }

      return {
        chair: b.chair,
        barber: b.name,
        barberId: b.id,
        token: null,
        client: 'Chair Open',
        service: 'Ready for Next Customer',
        status: 'Chair Open'
      };
    });

  // 2. Build "UP NEXT" list: exactly the next 5 waiting tokens (FCFS)
  const waitingTickets = activeTickets.filter((t) => t.status === 'Waiting');
  const upNextList = waitingTickets.slice(0, 5).map((t, idx) => ({
    rank: `#${idx + 1}`,
    token: t.token,
    client: t.customer_name,
    barber: t.preferredBarberName,
    wait: `${t.estimatedWaitTime}m`
  }));

  return (
    <div className="min-h-screen bg-salon-bg text-salon-text flex flex-col justify-between p-6 sm:p-8 lg:p-10 select-none">
      {/* Top TV Header Strip */}
      <div className="flex items-center justify-between pb-6 border-b border-salon-border">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-salon-primary flex items-center justify-center text-salon-bg shadow-md">
            <Scissors className="w-8 h-8 text-salon-accent" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-salon-primary tracking-tight">
              {t('salon_name')}
            </h1>
            <p className="text-xs uppercase tracking-widest text-salon-secondary font-bold">
              {language === 'gu' ? 'પ્રતીક્ષાલય લાઈવ કતાર બોર્ડ' : 'Waiting Area Live Queue Display'}
            </p>
          </div>
        </div>

        {/* Live Digital Clock, Queue Count & Fullscreen Toggle */}
        <div className="flex items-center space-x-5">
          <div className="text-right hidden sm:block">
            <div className="text-2xl sm:text-3xl font-mono font-black text-salon-primary">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-salon-muted uppercase font-semibold tracking-wider">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-salon-card border border-salon-border text-salon-primary font-bold text-sm shadow-sm flex items-center space-x-2">
            <Users className="w-4 h-4 text-salon-secondary" />
            <span>{waitingTickets.length} {t('home.in_line')}</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle TV Fullscreen"
            className="w-10 h-10 rounded-xl bg-salon-card border border-salon-border flex items-center justify-center text-salon-muted hover:text-salon-primary shadow-sm transition"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Screen Board: NOW SERVING (60%) + UP NEXT (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 flex-1">
        {/* Left: NOW SERVING (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-3 pb-2 border-b border-salon-border">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 animate-ping"></span>
            <h2 className="text-xl sm:text-2xl font-black text-salon-primary tracking-wider flex items-center space-x-2">
              <Scissors className="w-6 h-6 text-salon-secondary" />
              <span>{t('display.now_serving')}</span>
              {language !== 'gu' && (
                <span className="text-sm font-normal text-salon-muted tracking-normal">
                  / અત્યારે સેવા ચાલુ છે
                </span>
              )}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 flex-1">
            {nowServingChairs.map((chair) => {
              const isOccupied = chair.token !== null;
              const isFlashing = chair.isCalledFlash;

              return (
                <div
                  key={chair.chair}
                  className={`bg-salon-card rounded-2xl border-2 p-6 flex items-center justify-between shadow-sm transition duration-300 ${
                    isFlashing
                      ? 'border-salon-secondary ring-4 ring-salon-secondary/70 bg-salon-accent-light/60 scale-[1.01] animate-pulse'
                      : isOccupied
                      ? 'border-salon-secondary/50 shadow-md'
                      : 'border-salon-border opacity-90'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-widest text-salon-secondary font-extrabold">
                      {chair.chair} • {chair.barber}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-salon-primary">
                      {chair.client}
                    </div>
                    <span className="text-xs text-salon-muted block max-w-md truncate">
                      {chair.service}
                    </span>
                  </div>

                  <div className="text-right">
                    {chair.token ? (
                      <div>
                        <div className="text-5xl sm:text-6xl font-black font-mono text-salon-primary tracking-tight">
                          {chair.token}
                        </div>
                        <span
                          className={`inline-block mt-2 px-3.5 py-1 rounded-full text-xs font-black uppercase ${
                            chair.status === 'Called'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-bounce'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {chair.status === 'Called' ? "It's Your Turn!" : 'In Chair'}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-salon-bg text-salon-muted border border-salon-border">
                        {chair.status === 'On Break' ? 'On Break' : 'Ready for Client'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: UP NEXT (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col space-y-4 bg-salon-card rounded-2xl border border-salon-border p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-salon-border">
            <h2 className="text-xl sm:text-2xl font-black text-salon-primary tracking-wider">
              {t('display.up_next')}
              {language !== 'gu' && (
                <span className="text-xs font-normal text-salon-muted ml-2">/ હવે પછી</span>
              )}
            </h2>
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-salon-accent-light text-salon-primary">
              Next 5 Tokens
            </span>
          </div>

          <div className="divide-y divide-salon-border flex-1 flex flex-col justify-around">
            {upNextList.length > 0 ? (
              upNextList.map((item) => (
                <div key={item.token} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-black text-salon-muted font-mono w-6">
                      {item.rank}
                    </span>
                    <span className="text-3xl sm:text-4xl font-black font-mono text-salon-primary tracking-wide">
                      {item.token}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-salon-text block">
                      {item.barber}
                    </span>
                    <span className="text-[11px] text-salon-secondary font-semibold">
                      ~{item.wait} est. wait
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-salon-muted space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-salon-primary">Queue is clear!</p>
                <p className="text-xs">No upcoming customers waiting in line. Walk-ins welcome.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticker Footer */}
      <div className="rounded-xl bg-salon-card border border-salon-border py-3 px-5 flex items-center justify-between text-xs text-salon-primary font-semibold tracking-wide overflow-hidden shadow-sm">
        <div className="flex items-center space-x-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
          <span className="truncate">{t('display.ticker_msg')}</span>
        </div>
        <span className="text-[11px] text-salon-muted flex-shrink-0 pl-4 font-mono hidden md:inline">
          Scan QR at Desk to Track Remotely
        </span>
      </div>
    </div>
  );
};
