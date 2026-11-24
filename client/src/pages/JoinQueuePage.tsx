import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, User, Scissors, UserCheck, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Service {
  id: number;
  name_en: string;
  name_gu: string;
  duration: number;
  price: number;
  description_en: string;
  description_gu: string;
}

interface Barber {
  id: string;
  name: string;
  chair: string;
  is_on_duty: number;
  is_on_break: number;
  status: 'available' | 'busy' | 'break' | 'off';
}

export const JoinQueuePage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('any');

  // API State
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serviceLimitWarning, setServiceLimitWarning] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, barbersRes] = await Promise.all([
          fetch('/api/salon/services'),
          fetch('/api/salon/barbers')
        ]);

        if (servicesRes.ok) {
          const sData: Service[] = await servicesRes.json();
          setServices(sData);
          if (sData.length > 0) {
            setSelectedServices([sData[0].id]); // select first by default
          }
        }
        if (barbersRes.ok) {
          const bData: Barber[] = await barbersRes.json();
          setBarbers(bData);
        }
      } catch (err) {
        console.error('Failed to load services or barbers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleServiceToggle = (id: number) => {
    setErrorMessage(null);
    setServiceLimitWarning(false);

    if (selectedServices.includes(id)) {
      if (selectedServices.length === 1) return; // Keep at least 1
      setSelectedServices(selectedServices.filter((s) => s !== id));
    } else {
      if (selectedServices.length >= 3) {
        // Enforce Rule 6: Max 3 services
        setServiceLimitWarning(true);
        return;
      }
      setSelectedServices([...selectedServices, id]);
    }
  };

  // Calculations
  const chosenServices = services.filter((s) => selectedServices.includes(s.id));
  const totalDuration = chosenServices.reduce((acc, s) => acc + s.duration, 0);
  const totalPrice = chosenServices.reduce((acc, s) => acc + s.price, 0);

  // Check if chosen barber is on break (Rule 11)
  const chosenBarberObj = barbers.find((b) => b.id === selectedBarber);
  const isSelectedBarberOnBreak = chosenBarberObj && chosenBarberObj.is_on_break === 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (customerName.trim().length < 2) {
      setErrorMessage('Please enter a valid customer name (at least 2 characters).');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).');
      return;
    }

    if (selectedServices.length === 0 || selectedServices.length > 3) {
      setErrorMessage('Please select between 1 and 3 salon services.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: cleanPhone,
          serviceIds: selectedServices,
          preferredBarber: selectedBarber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to join the queue. Please check your information.');
        setSubmitting(false);
        return;
      }

      // Save token to localStorage for easy recovery
      localStorage.setItem('salon_active_ticket_id', data.ticket.id);
      localStorage.setItem('salon_active_token', data.ticket.token);

      // Navigate immediately to My Status screen
      navigate(`/status/${data.ticket.id}`);
    } catch (err: any) {
      setErrorMessage('Unable to connect to salon queue server. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn text-salon-text">
      {/* Top Navigation Back Link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-salon-muted hover:text-salon-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('join.back')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-salon-primary mt-2">
          {t('join.title')}
        </h1>
        <p className="text-sm text-salon-muted mt-1">{t('join.subtitle')}</p>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center space-x-3 text-red-800 text-sm shadow-sm animate-shake">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Service Limit Warning */}
      {serviceLimitWarning && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 flex items-center space-x-3 text-amber-900 text-xs shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Maximum 3 services can be selected per queue entry.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Personal Details & Service/Barber Selectors */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <div className="bg-salon-card border border-salon-border rounded-xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-salon-primary mb-4 flex items-center space-x-2">
              <User className="w-4 h-4 text-salon-secondary" />
              <span>Contact Information</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-salon-text uppercase tracking-wider mb-1.5">
                  {t('join.name_label')} *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('join.name_placeholder')}
                  className="w-full bg-salon-bg border border-salon-border focus:border-salon-primary rounded-lg px-3.5 py-2.5 text-sm text-salon-text placeholder-salon-muted focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-salon-text uppercase tracking-wider mb-1.5">
                  {t('join.phone_label')} (10 Digits) *
                </label>
                <div className="flex rounded-lg border border-salon-border focus-within:border-salon-primary bg-salon-bg overflow-hidden transition">
                  <span className="inline-flex items-center px-3 text-xs font-bold text-salon-muted border-r border-salon-border bg-salon-border-light">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('join.phone_placeholder')}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-salon-text placeholder-salon-muted focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Service Selection Card */}
          <div className="bg-salon-card border border-salon-border rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-salon-primary flex items-center space-x-2">
                <Scissors className="w-4 h-4 text-salon-secondary" />
                <span>{t('join.services_title')}</span>
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-salon-accent-light text-salon-primary border border-salon-accent">
                {selectedServices.length}/3 {t('join.services_limit')}
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-salon-muted">Loading services...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  const serviceName = language === 'gu' ? service.name_gu : service.name_en;
                  const serviceDesc = language === 'gu' ? service.description_gu : service.description_en;

                  const servicePhotos: Record<number, string> = {
                    1: '/images/hairstyles/haircut.jpg',
                    2: '/images/hairstyles/beard.jpg',
                    3: '/images/hairstyles/hairwash.jpg',
                    4: '/images/hairstyles/facial.jpg',
                  };
                  const photoSrc = servicePhotos[service.id] || '/images/hairstyles/haircut.jpg';

                  return (
                    <div
                      key={service.id}
                      onClick={() => handleServiceToggle(service.id)}
                      className={`cursor-pointer rounded-xl overflow-hidden border transition duration-150 flex flex-col justify-between ${
                        isSelected
                          ? 'bg-salon-accent-light/50 border-salon-primary shadow-sm'
                          : 'bg-salon-bg border-salon-border hover:border-salon-secondary'
                      }`}
                    >
                      <div className="h-28 w-full overflow-hidden bg-salon-card relative">
                        <img
                          src={photoSrc}
                          alt={service.name_en}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center border shadow-sm transition ${
                            isSelected ? 'bg-salon-primary border-salon-primary text-salon-card' : 'bg-white/80 border-salon-border text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>

                      <div className="p-3.5 flex flex-col justify-between flex-grow">
                        <div>
                          <h3 className="text-sm font-bold text-salon-primary">{serviceName}</h3>
                          <p className="text-xs text-salon-muted mt-1 leading-relaxed line-clamp-2">{serviceDesc}</p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-salon-border flex items-center justify-between text-xs font-bold">
                          <span className="text-salon-primary">₹{service.price}</span>
                          <span className="text-salon-muted">{service.duration} mins</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Barber Selection Card */}
          <div className="bg-salon-card border border-salon-border rounded-xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-salon-primary mb-2 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-salon-secondary" />
              <span>{t('join.barber_title')}</span>
            </h2>

            {/* Rule 11: Barber on Break Warning */}
            {isSelectedBarberOnBreak && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-900 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Barber {chosenBarberObj.name} is currently on break.</strong> Selecting this barber may result in a significantly longer wait time.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {/* Option 1: Any Barber (Fastest) */}
              <div
                onClick={() => setSelectedBarber('any')}
                className={`cursor-pointer rounded-xl p-4 border transition duration-150 flex items-center justify-between ${
                  selectedBarber === 'any'
                    ? 'bg-salon-accent-light/50 border-salon-primary shadow-sm'
                    : 'bg-salon-bg border-salon-border hover:border-salon-secondary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedBarber === 'any' ? 'border-salon-primary' : 'border-salon-muted'
                    }`}
                  >
                    {selectedBarber === 'any' && <div className="w-2 h-2 rounded-full bg-salon-primary"></div>}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-salon-primary">{t('join.any_barber')}</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-salon-primary text-salon-card">
                        Fastest
                      </span>
                    </div>
                    <p className="text-xs text-salon-muted mt-0.5">{t('join.any_barber_desc')}</p>
                  </div>
                </div>
              </div>

              {/* Individual Barbers */}
              {barbers.map((barber) => {
                const isSelected = selectedBarber === barber.id;
                return (
                  <div
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber.id)}
                    className={`cursor-pointer rounded-xl p-4 border transition duration-150 flex items-center justify-between ${
                      isSelected
                        ? 'bg-salon-accent-light/50 border-salon-primary shadow-sm'
                        : 'bg-salon-bg border-salon-border hover:border-salon-secondary'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-salon-primary' : 'border-salon-muted'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-salon-primary"></div>}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-salon-primary">{barber.name}</span>
                          <span className="text-xs text-salon-muted font-medium">({barber.chair})</span>
                          {barber.is_on_break === 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              On Break
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Sticky Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-salon-card border border-salon-border rounded-xl p-5 sm:p-6 shadow-sm sticky top-24">
            <h2 className="text-base font-bold text-salon-primary pb-3 border-b border-salon-border flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-salon-secondary" />
              <span>{t('join.summary_title')}</span>
            </h2>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between text-salon-muted font-medium">
                <span>Selected Services:</span>
                <span className="font-bold text-salon-primary">{chosenServices.length}</span>
              </div>

              <div className="space-y-1.5 pl-2 border-l border-salon-border">
                {chosenServices.map((s) => (
                  <div key={s.id} className="flex justify-between text-salon-muted">
                    <span className="truncate pr-2">{language === 'gu' ? s.name_gu : s.name_en}</span>
                    <span className="text-salon-primary font-bold">₹{s.price}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-salon-border flex justify-between text-salon-muted font-medium">
                <span>{t('join.total_duration')}:</span>
                <span className="font-bold text-salon-primary">{totalDuration} mins</span>
              </div>

              <div className="flex justify-between text-salon-muted font-medium">
                <span>{t('join.est_wait')}:</span>
                <span className="font-bold text-salon-secondary">
                  {selectedBarber === 'any' ? '~15 mins' : '~25 mins'}
                </span>
              </div>

              <div className="pt-3 border-t border-salon-border flex items-baseline justify-between text-sm">
                <span className="font-bold text-salon-primary">{t('join.total_price')}:</span>
                <span className="text-2xl font-black text-salon-primary">₹{totalPrice}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full py-3.5 px-4 rounded-xl bg-salon-primary text-salon-card font-extrabold text-sm hover:bg-salon-primary-hover transition duration-150 shadow-md disabled:opacity-60"
            >
              {submitting ? 'Securing your spot...' : t('join.confirm_btn')}
            </button>

            <div className="mt-4 text-[11px] text-salon-muted flex items-start space-x-2 leading-tight">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{t('join.disclaimer')}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
