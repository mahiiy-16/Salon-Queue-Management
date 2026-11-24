import React, { useState } from 'react';
import { Users, AlertTriangle, Plus, Scissors } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const ReceptionPage: React.FC = () => {
  const { t } = useLanguage();

  // Mock Active Chairs
  const chairStations = [
    { id: 1, barber: 'Vikram Singh', chair: 'Chair 1', status: 'busy', currentToken: 'S-11', clientName: 'Amit Shah', service: 'Executive Haircut', timeRemaining: '12 mins' },
    { id: 2, barber: 'Amit Shah', chair: 'Chair 2', status: 'available', currentToken: null, clientName: 'Vacant', service: 'Ready for client', timeRemaining: '-' },
    { id: 3, barber: 'Priya Joshi', chair: 'Chair 3', status: 'busy', currentToken: 'S-13', clientName: 'Devang V.', service: 'Facial & Scrub', timeRemaining: '18 mins' },
  ];

  // Mock Active Queue Table
  const waitingQueue = [
    { id: 'S-08', name: 'Karan Dave', phone: '98250 11223', services: 'Haircut + Beard', barber: 'Vikram Singh', waitTime: 68, isOverdue: true },
    { id: 'S-14', name: 'Rajesh Patel', phone: '98980 44556', services: 'Haircut + Beard Trim', barber: 'Any Barber', waitTime: 24, isOverdue: false },
    { id: 'S-15', name: 'Nikhil Mehta', phone: '97230 77889', services: 'Deep Conditioning Wash', barber: 'Priya Joshi', waitTime: 14, isOverdue: false },
    { id: 'S-16', name: 'Sunil Verma', phone: '98450 33441', services: 'Executive Haircut', barber: 'Any Barber', waitTime: 6, isOverdue: false },
  ];

  // Walk-in form state
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('any');

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
            <span className="text-base font-black text-salon-primary">4</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-salon-card border border-salon-border flex items-center space-x-2 shadow-sm">
            <span className="text-salon-muted">{t('reception.stat_in_chair')}:</span>
            <span className="text-base font-black text-emerald-700">2</span>
          </div>
        </div>
      </div>

      {/* High Wait Delay Alert Banner (>60 Mins) */}
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center space-x-3 text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>
            <strong className="font-bold">{t('reception.high_wait_alert')}:</strong> Karan Dave (Token: S-08) has been waiting for <strong className="text-red-700">68 mins</strong>.
          </span>
        </div>
        <button
          type="button"
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[11px] shadow-sm"
        >
          Prioritize
        </button>
      </div>

      {/* Active Barber Chairs Grid */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-salon-muted uppercase tracking-wider flex items-center space-x-2">
          <Scissors className="w-4 h-4 text-salon-secondary" />
          <span>{t('reception.chairs_title')}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chairStations.map((station) => (
            <div
              key={station.id}
              className="bg-salon-card border border-salon-border rounded-xl p-4 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-salon-border">
                  <span className="text-xs font-bold text-salon-primary">{station.barber}</span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    station.status === 'busy' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {station.status === 'busy' ? 'In Service' : 'Chair Open'}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-salon-muted">{t('reception.serving_label')}</span>
                    <span className="font-bold text-salon-primary">
                      {station.currentToken ? `${station.currentToken} - ${station.clientName}` : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-salon-muted">
                    <span>Service:</span>
                    <span className="text-salon-text truncate">{station.service}</span>
                  </div>
                  <div className="flex justify-between text-salon-muted">
                    <span>{t('reception.timer_remaining')}</span>
                    <span className="text-salon-primary font-mono font-bold">{station.timeRemaining}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-4 w-full py-2.5 rounded-lg bg-salon-primary text-salon-card font-extrabold text-xs hover:bg-salon-primary-hover transition duration-150 shadow"
              >
                {t('reception.call_next_btn')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Two-Panel Operational Workspace: Queue Table (60%) + Walk-In Form (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Waiting Customer Table (7 Cols) */}
        <div className="lg:col-span-7 bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-salon-primary flex items-center space-x-2">
              <Users className="w-4 h-4 text-salon-secondary" />
              <span>{t('reception.queue_table_title')}</span>
            </h2>
            <span className="text-xs text-salon-muted">{waitingQueue.length} In Line</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-salon-bg text-salon-muted uppercase tracking-wider text-[10px] border-b border-salon-border">
                <tr>
                  <th className="py-2.5 px-3">{t('reception.col_token')}</th>
                  <th className="py-2.5 px-3">{t('reception.col_customer')}</th>
                  <th className="py-2.5 px-3">{t('reception.col_services')}</th>
                  <th className="py-2.5 px-3">{t('reception.col_barber')}</th>
                  <th className="py-2.5 px-3">{t('reception.col_wait')}</th>
                  <th className="py-2.5 px-3 text-right">{t('reception.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-border text-salon-text">
                {waitingQueue.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-salon-bg/70 transition ${item.isOverdue ? 'bg-red-50/70' : ''}`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-salon-primary">{item.id}</td>
                    <td className="py-3 px-3 font-medium text-salon-text">
                      <div>{item.name}</div>
                      <div className="text-[10px] text-salon-muted">{item.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-salon-muted">{item.services}</td>
                    <td className="py-3 px-3 text-salon-muted">{item.barber}</td>
                    <td className="py-3 px-3 font-bold">
                      <span className={item.isOverdue ? 'text-red-700 font-extrabold' : 'text-salon-text'}>
                        {item.waitTime}m
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        title="Mark No-Show"
                        className="px-2 py-1 rounded bg-salon-bg border border-salon-border hover:border-red-400 text-salon-muted hover:text-red-600 text-[10px] font-medium"
                      >
                        {t('reception.btn_noshow')}
                      </button>
                      <button
                        type="button"
                        title="Cancel Spot"
                        className="px-2 py-1 rounded bg-salon-bg border border-salon-border hover:border-red-400 text-salon-muted hover:text-red-600 text-[10px] font-medium"
                      >
                        {t('reception.btn_cancel')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Add Walk-In Form (5 Cols) */}
        <div className="lg:col-span-5 bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-salon-primary flex items-center space-x-2 pb-3 border-b border-salon-border">
            <Plus className="w-4 h-4 text-salon-secondary" />
            <span>{t('reception.walkin_title')}</span>
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-salon-text mb-1">{t('join.name_label')} *</label>
              <input
                type="text"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="Client Name"
                className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-salon-text mb-1">{t('join.phone_label')} *</label>
              <input
                type="tel"
                maxLength={10}
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                placeholder="10-digit phone"
                className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-salon-text mb-1">Select Service</label>
              <select className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none">
                <option value="1">Executive Haircut (30m • ₹300)</option>
                <option value="2">Royal Beard Grooming (20m • ₹200)</option>
                <option value="3">Haircut + Beard Combo (45m • ₹450)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-salon-text mb-1">Assign Barber</label>
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
              >
                <option value="any">Any Barber (Fastest)</option>
                <option value="vikram">Vikram Singh (Chair 1)</option>
                <option value="amit">Amit Shah (Chair 2)</option>
                <option value="priya">Priya Joshi (Chair 3)</option>
              </select>
            </div>

            <button
              type="button"
              className="w-full mt-4 py-3 rounded-xl bg-salon-primary text-salon-card font-extrabold text-xs hover:bg-salon-primary-hover transition duration-150 shadow"
            >
              {t('reception.add_walkin_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
