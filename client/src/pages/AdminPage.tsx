import React, { useState } from 'react';
import { ShieldAlert, Edit2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const [isQueueOpen, setIsQueueOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'barbers'>('services');

  // Mock Service Catalog
  const [servicesList] = useState([
    { id: 1, nameEn: 'Executive Haircut', nameGu: 'એક્ઝિક્યુટિવ હેરકટ', duration: 30, price: 300, active: true },
    { id: 2, nameEn: 'Royal Beard Grooming', nameGu: 'રોયલ દાઢી ગ્રૂમિંગ', duration: 20, price: 200, active: true },
    { id: 3, nameEn: 'Deep Conditioning Hair Wash', nameGu: 'ડીપ કન્ડિશનિંગ હેર વૉશ', duration: 15, price: 150, active: true },
    { id: 4, nameEn: 'Revitalizing Facial', nameGu: 'રિવાઇટલાઇઝિંગ ફેશિયલ', duration: 35, price: 450, active: false },
  ]);

  // Mock Barber Roster
  const [barbersList] = useState([
    { id: 1, name: 'Vikram Singh', chair: 'Chair 1', onDuty: true, onBreak: false },
    { id: 2, name: 'Amit Shah', chair: 'Chair 2', onDuty: true, onBreak: false },
    { id: 3, name: 'Priya Joshi', chair: 'Chair 3', onDuty: true, onBreak: true },
    { id: 4, name: 'Sameer Khan', chair: 'Chair 4', onDuty: false, onBreak: false },
  ]);

  return (
    <div className="space-y-6 animate-fadeIn text-salon-text">
      {/* Admin Title Header */}
      <div className="flex items-center justify-between pb-4 border-b border-salon-border">
        <div>
          <span className="text-xs font-bold text-salon-secondary uppercase tracking-wider">Screen 7</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-salon-primary mt-0.5">
            {t('admin.title')}
          </h1>
          <p className="text-xs text-salon-muted mt-1">
            Master salon operational parameters, service definitions, and daily throughput.
          </p>
        </div>
      </div>

      {/* Master Queue Open / Close Control Hero */}
      <div className="bg-salon-card border border-salon-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-salon-primary flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-salon-secondary" />
            <span>{t('admin.master_queue_title')}</span>
          </h2>
          <p className="text-xs text-salon-muted mt-1">
            {isQueueOpen ? t('admin.master_queue_open') : t('admin.master_queue_closed')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          className={`px-6 py-2.5 rounded-xl font-black text-xs transition duration-200 shadow ${
            isQueueOpen
              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isQueueOpen ? 'QUEUE OPEN [ACTIVE]' : 'QUEUE CLOSED'}
        </button>
      </div>

      {/* Daily Performance Metrics Row (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_served')}</p>
          <p className="text-2xl font-black text-salon-primary mt-1">38</p>
          <span className="text-[10px] text-emerald-700 font-semibold">+12% vs yesterday</span>
        </div>

        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_avg_wait')}</p>
          <p className="text-2xl font-black text-salon-primary mt-1">18 <span className="text-xs text-salon-secondary">mins</span></p>
          <span className="text-[10px] text-salon-muted">Target: &lt; 25 mins</span>
        </div>

        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_noshows')}</p>
          <p className="text-2xl font-black text-salon-primary mt-1">3</p>
          <span className="text-[10px] text-red-600 font-semibold">7.3% rate</span>
        </div>

        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_depth')}</p>
          <p className="text-2xl font-black text-salon-secondary mt-1">5</p>
          <span className="text-[10px] text-salon-muted">Across 3 active chairs</span>
        </div>
      </div>

      {/* Tab Navigation: Service Catalog vs. Barber Roster */}
      <div className="flex space-x-2 border-b border-salon-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'services'
              ? 'bg-salon-primary text-salon-card font-extrabold shadow'
              : 'text-salon-muted hover:text-salon-primary hover:bg-salon-card'
          }`}
        >
          {t('admin.tab_services')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('barbers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'barbers'
              ? 'bg-salon-primary text-salon-card font-extrabold shadow'
              : 'text-salon-muted hover:text-salon-primary hover:bg-salon-card'
          }`}
        >
          {t('admin.tab_barbers')}
        </button>
      </div>

      {/* Tab Content 1: Service Catalog */}
      {activeTab === 'services' && (
        <div className="bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-salon-border">
            <h3 className="text-sm font-bold text-salon-primary uppercase tracking-wider">Services List</h3>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-salon-primary text-salon-card text-xs font-bold hover:bg-salon-primary-hover transition"
            >
              {t('admin.btn_add_service')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-salon-bg text-salon-muted uppercase tracking-wider text-[10px] border-b border-salon-border">
                <tr>
                  <th className="py-2.5 px-3">{t('admin.col_name_en')}</th>
                  <th className="py-2.5 px-3">{t('admin.col_name_gu')}</th>
                  <th className="py-2.5 px-3">{t('admin.col_duration')}</th>
                  <th className="py-2.5 px-3">{t('admin.col_price')}</th>
                  <th className="py-2.5 px-3">{t('admin.col_status')}</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-border text-salon-text">
                {servicesList.map((svc) => (
                  <tr key={svc.id} className="hover:bg-salon-bg/70">
                    <td className="py-3 px-3 font-medium text-salon-primary">{svc.nameEn}</td>
                    <td className="py-3 px-3 text-salon-muted font-sans">{svc.nameGu}</td>
                    <td className="py-3 px-3 text-salon-muted">{svc.duration} mins</td>
                    <td className="py-3 px-3 font-bold text-salon-primary">₹{svc.price}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        svc.active ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {svc.active ? t('admin.status_active') : t('admin.status_disabled')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button type="button" className="text-salon-muted hover:text-salon-primary">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 2: Barber Roster */}
      {activeTab === 'barbers' && (
        <div className="bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-salon-border">
            <h3 className="text-sm font-bold text-salon-primary uppercase tracking-wider">Barber Duty Roster</h3>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-salon-primary text-salon-card text-xs font-bold hover:bg-salon-primary-hover transition"
            >
              {t('admin.btn_add_barber')}
            </button>
          </div>

          <div className="divide-y divide-salon-border">
            {barbersList.map((barber) => (
              <div key={barber.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-salon-bg border border-salon-border flex items-center justify-center text-salon-primary font-bold">
                    {barber.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-salon-primary">{barber.name}</h4>
                    <p className="text-[11px] text-salon-muted">{barber.chair}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    barber.onDuty ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {barber.onDuty ? 'On Duty' : 'Off Duty'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    barber.onBreak ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {barber.onBreak ? 'On Break' : 'Available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
