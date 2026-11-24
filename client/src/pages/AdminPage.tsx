import React, { useState, useEffect } from 'react';
import { ShieldAlert, Edit2, Plus, Trash2, CheckCircle2, AlertTriangle, Users, Scissors, Clock, Power } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';
import { apiEndpoint } from '../lib/api';

interface Service {
  id: number;
  name_en: string;
  name_gu: string;
  duration: number;
  price: number;
  description_en: string;
  description_gu: string;
  is_active: number;
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

interface Metrics {
  servedCount: number;
  noShowCount: number;
  waitingDepth: number;
  avgWaitTime: number;
}

export const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const { socket } = useSocket();

  const [isQueueOpen, setIsQueueOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'barbers'>('services');

  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [barbersList, setBarbersList] = useState<Barber[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    servedCount: 0,
    noShowCount: 0,
    waitingDepth: 0,
    avgWaitTime: 15
  });

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State: Service
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [serviceNameGu, setServiceNameGu] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [servicePrice, setServicePrice] = useState('300');
  const [serviceDescEn, setServiceDescEn] = useState('');
  const [serviceDescGu, setServiceDescGu] = useState('');
  const [serviceActive, setServiceActive] = useState(true);

  // Modal State: Barber
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [barberName, setBarberName] = useState('');
  const [barberChair, setBarberChair] = useState('Chair 1');
  const [barberSpec, setBarberSpec] = useState('Master Stylist');
  const [barberOnDuty, setBarberOnDuty] = useState(true);
  const [barberOnBreak, setBarberOnBreak] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [statusRes, servicesRes, barbersRes, metricsRes] = await Promise.all([
        fetch(apiEndpoint('/api/salon/status')),
        fetch(apiEndpoint('/api/salon/services/all')),
        fetch(apiEndpoint('/api/salon/barbers')),
        fetch(apiEndpoint('/api/salon/metrics'))
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setIsQueueOpen(sData.isOpen);
      }
      if (servicesRes.ok) {
        const svcs = await servicesRes.json();
        setServicesList(svcs);
      }
      if (barbersRes.ok) {
        const bData = await barbersRes.json();
        setBarbersList(bData);
      }
      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    if (socket) {
      socket.on('queue:updated', () => {
        fetchAdminData();
      });

      return () => {
        socket.off('queue:updated');
      };
    }
  }, [socket]);

  // Handle Toggle Online Queue
  const handleToggleQueue = async () => {
    const nextState = !isQueueOpen;
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const res = await fetch(apiEndpoint('/api/salon/settings/queue_open'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: nextState })
      });

      if (res.ok) {
        setIsQueueOpen(nextState);
        setActionMessage(
          nextState
            ? 'Online queue has been OPENED. Remote customers can now join.'
            : 'Online queue has been CLOSED. Walk-ins can still be registered by receptionist.'
        );
      } else {
        setErrorMessage('Failed to update online queue switch.');
      }
    } catch {
      setErrorMessage('Network error updating queue setting.');
    }
  };

  // Service Modal Openers
  const openAddServiceModal = () => {
    setEditingServiceId(null);
    setServiceNameEn('');
    setServiceNameGu('');
    setServiceDuration('30');
    setServicePrice('300');
    setServiceDescEn('');
    setServiceDescGu('');
    setServiceActive(true);
    setShowServiceModal(true);
  };

  const openEditServiceModal = (service: Service) => {
    setEditingServiceId(service.id);
    setServiceNameEn(service.name_en);
    setServiceNameGu(service.name_gu);
    setServiceDuration(service.duration.toString());
    setServicePrice(service.price.toString());
    setServiceDescEn(service.description_en || '');
    setServiceDescGu(service.description_gu || '');
    setServiceActive(service.is_active === 1);
    setShowServiceModal(true);
  };

  // Save Service (Create or Update)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload = {
      name_en: serviceNameEn,
      name_gu: serviceNameGu,
      duration: parseInt(serviceDuration, 10),
      price: parseFloat(servicePrice),
      description_en: serviceDescEn,
      description_gu: serviceDescGu,
      is_active: serviceActive ? 1 : 0
    };

    try {
      const url = editingServiceId ? apiEndpoint(`/api/salon/services/${editingServiceId}`) : apiEndpoint('/api/salon/services');
      const method = editingServiceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save service.');
      } else {
        setActionMessage(editingServiceId ? 'Service updated successfully.' : 'Service added successfully.');
        setShowServiceModal(false);
        fetchAdminData();
      }
    } catch {
      setErrorMessage('Network error saving service.');
    }
  };

  // Delete Service
  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      const res = await fetch(apiEndpoint(`/api/salon/services/${id}`), { method: 'DELETE' });
      if (res.ok) {
        setActionMessage('Service removed.');
        fetchAdminData();
      }
    } catch {
      setErrorMessage('Failed to delete service.');
    }
  };

  // Barber Modal Openers
  const openAddBarberModal = () => {
    setEditingBarberId(null);
    setBarberName('');
    setBarberChair(`Chair ${barbersList.length + 1}`);
    setBarberSpec('Master Stylist');
    setBarberOnDuty(true);
    setBarberOnBreak(false);
    setShowBarberModal(true);
  };

  const openEditBarberModal = (barber: Barber) => {
    setEditingBarberId(barber.id);
    setBarberName(barber.name);
    setBarberChair(barber.chair);
    setBarberSpec(barber.specialization);
    setBarberOnDuty(barber.is_on_duty === 1);
    setBarberOnBreak(barber.is_on_break === 1);
    setShowBarberModal(true);
  };

  // Save Barber
  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload = {
      name: barberName,
      chair: barberChair,
      specialization: barberSpec,
      is_on_duty: barberOnDuty ? 1 : 0,
      is_on_break: barberOnBreak ? 1 : 0
    };

    try {
      const url = editingBarberId ? apiEndpoint(`/api/salon/barbers/${editingBarberId}`) : apiEndpoint('/api/salon/barbers');
      const method = editingBarberId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save barber.');
      } else {
        setActionMessage(editingBarberId ? 'Barber profile updated.' : 'Barber added successfully.');
        setShowBarberModal(false);
        fetchAdminData();
      }
    } catch {
      setErrorMessage('Network error saving barber.');
    }
  };

  // Toggle Barber Duty / Break Quick Switch
  const handleToggleBarberDuty = async (barber: Barber) => {
    const nextDuty = barber.is_on_duty === 1 ? 0 : 1;
    try {
      await fetch(apiEndpoint(`/api/salon/barbers/${barber.id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_on_duty: nextDuty })
      });
      fetchAdminData();
    } catch {}
  };

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
            Master salon operational parameters, service definitions, barber roster, and daily analytics.
          </p>
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

      {/* Master Online Queue Open / Close Control Hero */}
      <div className="bg-salon-card border-2 border-salon-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-salon-primary flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-salon-secondary" />
            <span>{t('admin.master_queue_title')}</span>
          </h2>
          <p className="text-xs text-salon-muted mt-1">
            {isQueueOpen ? t('admin.master_queue_open') : t('admin.master_queue_closed')}
          </p>
          <span className="text-[11px] text-salon-secondary font-medium block mt-0.5">
            Rule 9 & 10: Walk-in customers remain available on Reception even if online joining is closed.
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleQueue}
          className={`px-6 py-3 rounded-xl font-black text-xs transition duration-200 shadow-md flex items-center space-x-2 ${
            isQueueOpen
              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{isQueueOpen ? 'ONLINE QUEUE OPEN [ACTIVE]' : 'ONLINE QUEUE CLOSED'}</span>
        </button>
      </div>

      {/* Daily Performance Metrics Row (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_served')}</p>
          <p className="text-2xl font-black text-salon-primary mt-1">{metrics.servedCount}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">Today completed</span>
        </div>

        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_avg_wait')}</p>
          <p className="text-2xl font-black text-salon-primary mt-1">{metrics.avgWaitTime} <span className="text-xs text-salon-secondary">mins</span></p>
          <span className="text-[10px] text-salon-muted">Standard benchmark</span>
        </div>

        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_noshows')}</p>
          <p className="text-2xl font-black text-salon-primary mt-1">{metrics.noShowCount}</p>
          <span className="text-[10px] text-red-600 font-semibold">Total no-shows today</span>
        </div>

        <div className="bg-salon-card border border-salon-border rounded-xl p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-salon-muted font-semibold">{t('admin.stat_depth')}</p>
          <p className="text-2xl font-black text-salon-secondary mt-1">{metrics.waitingDepth}</p>
          <span className="text-[10px] text-salon-muted">Waiting clients</span>
        </div>
      </div>

      {/* Tab Navigation: Service Catalog vs. Barber Roster */}
      <div className="flex space-x-2 border-b border-salon-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'services'
              ? 'bg-salon-primary text-salon-card font-extrabold shadow'
              : 'text-salon-muted hover:text-salon-primary hover:bg-salon-card'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>{t('admin.tab_services')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('barbers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'barbers'
              ? 'bg-salon-primary text-salon-card font-extrabold shadow'
              : 'text-salon-muted hover:text-salon-primary hover:bg-salon-card'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('admin.tab_barbers')}</span>
        </button>
      </div>

      {/* Tab Content 1: Service Catalog */}
      {activeTab === 'services' && (
        <div className="bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-salon-border">
            <h3 className="text-sm font-bold text-salon-primary uppercase tracking-wider">
              Salon Services Catalog ({servicesList.length})
            </h3>
            <button
              type="button"
              onClick={openAddServiceModal}
              className="px-3.5 py-1.5 rounded-lg bg-salon-primary text-salon-card text-xs font-bold hover:bg-salon-primary-hover transition shadow-sm flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('admin.btn_add_service')}</span>
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-salon-muted py-6 text-center">Loading services catalog...</p>
          ) : (
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
                    <tr key={svc.id} className="hover:bg-salon-bg/70 transition">
                      <td className="py-3 px-3 font-semibold text-salon-primary">{svc.name_en}</td>
                      <td className="py-3 px-3 text-salon-muted font-sans">{svc.name_gu}</td>
                      <td className="py-3 px-3 text-salon-muted">
                        <Clock className="w-3 h-3 inline mr-1 text-salon-secondary" />
                        {svc.duration} mins
                      </td>
                      <td className="py-3 px-3 font-bold text-salon-primary">₹{svc.price}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            svc.is_active === 1
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {svc.is_active === 1 ? t('admin.status_active') : t('admin.status_disabled')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditServiceModal(svc)}
                          title="Edit Service"
                          className="text-salon-muted hover:text-salon-primary p-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(svc.id)}
                          title="Delete Service"
                          className="text-salon-muted hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Barber Roster */}
      {activeTab === 'barbers' && (
        <div className="bg-salon-card border border-salon-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-salon-border">
            <h3 className="text-sm font-bold text-salon-primary uppercase tracking-wider">
              Barber Duty Roster & Chairs ({barbersList.length})
            </h3>
            <button
              type="button"
              onClick={openAddBarberModal}
              className="px-3.5 py-1.5 rounded-lg bg-salon-primary text-salon-card text-xs font-bold hover:bg-salon-primary-hover transition shadow-sm flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('admin.btn_add_barber')}</span>
            </button>
          </div>

          <div className="divide-y divide-salon-border">
            {barbersList.map((barber) => (
              <div key={barber.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-salon-bg border border-salon-border flex items-center justify-center text-salon-primary font-bold">
                    {barber.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-salon-primary">{barber.name}</h4>
                    <p className="text-[11px] text-salon-muted">
                      {barber.chair} • {barber.specialization}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Quick Toggle On Duty */}
                  <button
                    type="button"
                    onClick={() => handleToggleBarberDuty(barber)}
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition ${
                      barber.is_on_duty === 1
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-gray-100 text-gray-600 border-gray-300'
                    }`}
                  >
                    {barber.is_on_duty === 1 ? 'On Duty' : 'Off Duty'}
                  </button>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      barber.is_on_break === 1
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {barber.is_on_break === 1 ? 'On Break' : 'Available'}
                  </span>

                  <button
                    type="button"
                    onClick={() => openEditBarberModal(barber)}
                    className="text-salon-muted hover:text-salon-primary p-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-salon-card border border-salon-border max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-salon-text">
            <h3 className="text-base font-bold text-salon-primary pb-2 border-b border-salon-border">
              {editingServiceId ? 'Edit Service' : 'Add New Service'}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Service Name (English) *</label>
                <input
                  type="text"
                  required
                  value={serviceNameEn}
                  onChange={(e) => setServiceNameEn(e.target.value)}
                  placeholder="e.g., Executive Haircut"
                  className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Service Name (Gujarati / ગુજરાતી) *</label>
                <input
                  type="text"
                  required
                  value={serviceNameGu}
                  onChange={(e) => setServiceNameGu(e.target.value)}
                  placeholder="દા.ત. એક્ઝિક્યુટિવ હેરકટ"
                  className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Duration (Minutes) *</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={180}
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Short Description (English)</label>
                <input
                  type="text"
                  value={serviceDescEn}
                  onChange={(e) => setServiceDescEn(e.target.value)}
                  placeholder="Brief description"
                  className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Short Description (Gujarati)</label>
                <input
                  type="text"
                  value={serviceDescGu}
                  onChange={(e) => setServiceDescGu(e.target.value)}
                  placeholder="ટૂંકી વિગત"
                  className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="svcActive"
                  checked={serviceActive}
                  onChange={(e) => setServiceActive(e.target.checked)}
                  className="rounded text-salon-primary focus:ring-salon-primary"
                />
                <label htmlFor="svcActive" className="font-semibold text-salon-text cursor-pointer">
                  Active (Visible on Customer Join Queue page)
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-salon-border">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-salon-border text-xs font-bold text-salon-muted hover:bg-salon-bg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-salon-primary text-salon-card text-xs font-extrabold hover:bg-salon-primary-hover transition shadow-sm"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Barber Modal */}
      {showBarberModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-salon-card border border-salon-border max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-salon-text">
            <h3 className="text-base font-bold text-salon-primary pb-2 border-b border-salon-border">
              {editingBarberId ? 'Edit Stylist' : 'Add New Stylist'}
            </h3>

            <form onSubmit={handleSaveBarber} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Stylist Full Name *</label>
                <input
                  type="text"
                  required
                  value={barberName}
                  onChange={(e) => setBarberName(e.target.value)}
                  placeholder="e.g., Vikram Singh"
                  className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Chair / Station *</label>
                  <input
                    type="text"
                    required
                    value={barberChair}
                    onChange={(e) => setBarberChair(e.target.value)}
                    placeholder="e.g., Chair 1"
                    className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Specialization</label>
                  <input
                    type="text"
                    value={barberSpec}
                    onChange={(e) => setBarberSpec(e.target.value)}
                    placeholder="e.g., Master Stylist"
                    className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3 py-2 text-salon-text focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={barberOnDuty}
                    onChange={(e) => setBarberOnDuty(e.target.checked)}
                    className="rounded text-salon-primary focus:ring-salon-primary"
                  />
                  <span>On Duty Today</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={barberOnBreak}
                    onChange={(e) => setBarberOnBreak(e.target.checked)}
                    className="rounded text-salon-primary focus:ring-salon-primary"
                  />
                  <span>Currently On Break</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-salon-border">
                <button
                  type="button"
                  onClick={() => setShowBarberModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-salon-border text-xs font-bold text-salon-muted hover:bg-salon-bg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-salon-primary text-salon-card text-xs font-extrabold hover:bg-salon-primary-hover transition shadow-sm"
                >
                  Save Stylist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
