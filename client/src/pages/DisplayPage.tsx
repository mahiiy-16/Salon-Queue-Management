import React, { useState, useEffect } from 'react';
import { Scissors } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const DisplayPage: React.FC = () => {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock Chairs Currently Serving
  const nowServingChairs = [
    { chair: 'Chair 1', barber: 'Vikram', token: 'S-11', client: 'Amit S.', service: 'Haircut & Beard', status: 'In Chair' },
    { chair: 'Chair 2', barber: 'Amit', token: 'S-12', client: 'Rahul S.', service: 'Royal Grooming', status: 'In Chair' },
    { chair: 'Chair 3', barber: 'Priya', token: 'S-13', client: 'Devang V.', service: 'Facial & Styling', status: 'In Chair' },
  ];

  // Mock Up Next 5 Tokens
  const upNextList = [
    { rank: '#1', token: 'S-14', barber: 'Any Barber', wait: '5m' },
    { rank: '#2', token: 'S-15', barber: 'Priya Joshi', wait: '12m' },
    { rank: '#3', token: 'S-16', barber: 'Any Barber', wait: '20m' },
    { rank: '#4', token: 'S-17', barber: 'Vikram Singh', wait: '28m' },
    { rank: '#5', token: 'S-18', barber: 'Any Barber', wait: '35m' },
  ];

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
              Waiting Area Queue Board
            </p>
          </div>
        </div>

        {/* Live Digital Clock & Queue Depth Badge */}
        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block">
            <div className="text-2xl sm:text-3xl font-mono font-black text-salon-primary">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-salon-muted uppercase font-semibold tracking-wider">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>

          <div className="px-4 py-2 rounded-xl bg-salon-card border border-salon-secondary/40 text-salon-primary font-bold text-sm shadow-sm">
            5 Waiting in Lobby
          </div>
        </div>
      </div>

      {/* Main Two-Column Screen Board: NOW SERVING (60%) + UP NEXT (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 flex-1">
        {/* Left: NOW SERVING (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-3 pb-2 border-b border-salon-border">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 animate-ping"></span>
            <h2 className="text-xl sm:text-2xl font-black text-emerald-800 tracking-wider">
              {t('display.now_serving')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 flex-1">
            {nowServingChairs.map((chair, index) => (
              <div
                key={chair.chair}
                className={`bg-salon-card rounded-2xl border-2 p-6 flex items-center justify-between shadow-sm transition duration-300 ${
                  index === 0
                    ? 'border-salon-secondary shadow-md ring-2 ring-salon-accent/50'
                    : 'border-salon-border'
                }`}
              >
                <div>
                  <span className="text-xs uppercase tracking-widest text-salon-secondary font-bold">
                    {chair.chair} • {chair.barber}
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-salon-primary mt-1">
                    {chair.client}
                  </div>
                  <span className="text-xs text-salon-muted mt-0.5 block">{chair.service}</span>
                </div>

                <div className="text-right">
                  <div className="text-5xl sm:text-6xl font-black font-mono text-salon-primary tracking-tight">
                    {chair.token}
                  </div>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {chair.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: UP NEXT (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col space-y-4 bg-salon-card rounded-2xl border border-salon-border p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-salon-border">
            <h2 className="text-xl sm:text-2xl font-black text-salon-primary tracking-wider">
              {t('display.up_next')}
            </h2>
            <span className="text-xs font-bold text-salon-muted">Tokens</span>
          </div>

          <div className="divide-y divide-salon-border flex-1 flex flex-col justify-around">
            {upNextList.map((item) => (
              <div key={item.token} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-black text-salon-muted font-mono w-6">
                    {item.rank}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-salon-primary tracking-wide">
                    {item.token}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-salon-text block">{item.barber}</span>
                  <span className="text-[11px] text-salon-secondary font-semibold">~{item.wait}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ticker Footer */}
      <div className="rounded-xl bg-salon-card border border-salon-border py-3 px-5 text-center text-xs text-salon-primary font-semibold tracking-wide overflow-hidden shadow-sm">
        <span>{t('display.ticker_msg')}</span>
      </div>
    </div>
  );
};
