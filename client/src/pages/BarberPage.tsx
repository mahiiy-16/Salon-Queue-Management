import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Play, CheckCircle2, Coffee, Scissors } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const BarberPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const { t } = useLanguage();

  const barberName = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Vikram';
  const [isOnBreak, setIsOnBreak] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn text-salon-text">
      {/* Barber Station Header */}
      <div className="bg-salon-card border border-salon-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-salon-bg border border-salon-secondary/30 flex items-center justify-center text-salon-primary font-bold text-lg">
            {barberName[0]}
          </div>
          <div>
            <span className="text-xs font-semibold text-salon-secondary uppercase tracking-wider">Screen 5</span>
            <h1 className="text-2xl font-black text-salon-primary">{t('barber.chair')} 1 — {barberName}</h1>
            <p className="text-xs text-salon-muted">Station Active • The Royal Cut Salon</p>
          </div>
        </div>

        {/* Available vs On Break Toggle */}
        <div className="flex items-center space-x-2 bg-salon-bg p-1.5 rounded-xl border border-salon-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsOnBreak(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              !isOnBreak ? 'bg-emerald-700 text-white shadow-sm' : 'text-salon-muted hover:text-salon-primary'
            }`}
          >
            Available
          </button>
          <button
            type="button"
            onClick={() => setIsOnBreak(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              isOnBreak ? 'bg-amber-600 text-white shadow-sm' : 'text-salon-muted hover:text-salon-primary'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>On Break</span>
          </button>
        </div>
      </div>

      {/* Main Focus Card: Currently Serving */}
      <div className="bg-salon-card border-2 border-salon-secondary/40 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-salon-border">
          <div className="flex items-center space-x-2">
            <Scissors className="w-5 h-5 text-salon-primary" />
            <span className="text-sm font-extrabold uppercase tracking-wider text-salon-primary">
              {t('barber.currently_serving')}
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            In Chair
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Customer Details */}
          <div>
            <div className="flex items-baseline space-x-3">
              <span className="text-4xl sm:text-5xl font-black text-salon-primary font-mono">S-12</span>
              <div>
                <h2 className="text-xl font-bold text-salon-text">Rahul Sharma</h2>
                <p className="text-xs text-salon-muted">+91 98251 • Joined Remotely</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-salon-bg border border-salon-border text-xs space-y-1.5">
              <span className="font-bold text-salon-primary uppercase tracking-wider text-[10px]">
                Services Requested
              </span>
              <p className="text-sm font-semibold text-salon-text">Executive Haircut + Beard Grooming</p>
              <p className="text-salon-muted">Standard Scheduled Duration: 45 minutes</p>
            </div>
          </div>

          {/* Service Stopwatch / Countdown Timer */}
          <div className="text-center p-6 bg-salon-bg rounded-xl border border-salon-border flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-widest text-salon-muted flex items-center space-x-1.5 mb-2">
              <Clock className="w-4 h-4 text-salon-primary" />
              <span>{t('barber.service_timer')}</span>
            </span>
            <div className="text-5xl font-black font-mono text-salon-primary tracking-wider">
              28:45
            </div>
            <p className="text-xs text-salon-muted mt-1">Expected: 45:00 (16 mins remaining)</p>

            {/* Progress Bar */}
            <div className="w-full bg-salon-border rounded-full h-2 mt-4 overflow-hidden">
              <div className="bg-salon-primary h-2 rounded-full w-[65%]"></div>
            </div>
          </div>
        </div>

        {/* Primary Controls: Start and Done */}
        <div className="mt-8 pt-6 border-t border-salon-border flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="flex-1 py-3.5 rounded-xl bg-salon-bg border border-salon-secondary/50 text-salon-primary font-bold text-sm hover:bg-salon-accent-light transition duration-150 flex items-center justify-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>{t('barber.btn_start')}</span>
          </button>
          <button
            type="button"
            className="flex-1 py-3.5 rounded-xl bg-salon-primary text-salon-card font-extrabold text-sm hover:bg-salon-primary-hover transition duration-150 flex items-center justify-center space-x-2 shadow-md"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{t('barber.btn_done')}</span>
          </button>
        </div>
      </div>

      {/* Up Next Card */}
      <div className="bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-salon-bg border border-salon-border flex items-center justify-center text-salon-primary font-black font-mono text-xl">
            S-14
          </div>
          <div>
            <span className="text-xs font-bold text-salon-muted uppercase tracking-wider">
              {t('barber.up_next_title')}
            </span>
            <h3 className="text-base font-bold text-salon-primary">Rajesh Patel</h3>
            <p className="text-xs text-salon-muted">Haircut + Beard Trim • Waiting for 18 mins</p>
          </div>
        </div>

        <span className="text-xs text-salon-muted hidden sm:block">
          3 {t('barber.chair_queue_count')}
        </span>
      </div>
    </div>
  );
};
