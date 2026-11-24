import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, ArrowRight, Scissors, Sparkles, CheckCircle2, AlertCircle, MapPin, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';
import { apiEndpoint } from '../lib/api';

interface SalonStatus {
  isOpen: boolean;
  waitingCount: number;
  inChairCount: number;
  workingBarbersCount: number;
  estimatedWaitTime: number;
}

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
  queueDepth: number;
  status: 'available' | 'busy' | 'break' | 'off';
}

export const HomePage: React.FC = () => {
  const { t, language } = useLanguage();
  const { socket } = useSocket();

  const [status, setStatus] = useState<SalonStatus>({
    isOpen: true,
    waitingCount: 0,
    inChairCount: 0,
    workingBarbersCount: 3,
    estimatedWaitTime: 0,
  });

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveStatus = async () => {
    try {
      const [statusRes, servicesRes, barbersRes] = await Promise.all([
        fetch(apiEndpoint('/api/salon/status')),
        fetch(apiEndpoint('/api/salon/services')),
        fetch(apiEndpoint('/api/salon/barbers'))
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
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
    <div className="space-y-10 animate-fadeIn text-salon-text">
      {/* Hero Welcome & Queue Summary Banner with Salon Interior */}
      <div className="relative overflow-hidden rounded-2xl bg-salon-card border border-salon-border shadow-sm">
        {/* Visual Banner Accent */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-salon-accent-light text-salon-primary border border-salon-accent">
                  <Sparkles className="w-3.5 h-3.5 text-salon-secondary" />
                  <span>{t('home.welcome_badge')}</span>
                </span>
                {!status.isOpen ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{t('queue_closed')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{t('queue_open')}</span>
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
                <span>Select 1 to 3 services & choose your stylist</span>
              </span>
            </div>
          </div>

          {/* Right Column: Premium Salon Ambience Photography */}
          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full overflow-hidden border-t lg:border-t-0 lg:border-l border-salon-border">
            <img
              src="/images/salon-interior.jpg"
              alt="The Royal Cut Salon Luxury Interior"
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
              <span className="text-[11px] font-bold tracking-widest uppercase text-salon-accent">
                Refined Grooming Lounge
              </span>
              <p className="text-sm font-semibold mt-1">
                Experience precision styling in a calm, luxurious ambiance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Menu Catalog Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 pb-2 border-b border-salon-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-salon-primary tracking-tight flex items-center space-x-2">
              <Scissors className="w-5 h-5 text-salon-secondary" />
              <span>{language === 'gu' ? 'સેવાઓ અને કિંમત' : 'Featured Salon Services'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-salon-muted">
              {language === 'gu'
                ? 'અમારા પ્રીમિયમ ગ્રૂમિંગ સેવાઓ બ્રાઉઝ કરો અને કતારમાં જોડાઓ'
                : 'Browse our grooming offerings and select up to 3 services when joining the queue'}
            </p>
          </div>
          <Link
            to="/join"
            className="text-xs text-salon-primary font-bold hover:text-salon-secondary transition"
          >
            {language === 'gu' ? 'બધી પસંદ કરો' : 'View & Select'} &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service) => {
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
                className="bg-salon-card border border-salon-border hover:border-salon-secondary rounded-xl overflow-hidden transition duration-150 shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="h-40 w-full overflow-hidden bg-salon-bg relative">
                    <img
                      src={photoSrc}
                      alt={service.name_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-salon-card/90 backdrop-blur-sm text-salon-primary font-black px-2 py-0.5 rounded text-xs shadow-sm">
                      ₹{service.price}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-salon-primary">
                      {language === 'gu' ? service.name_gu : service.name_en}
                    </h3>
                    <p className="text-xs text-salon-muted mt-1.5 leading-relaxed">
                      {language === 'gu' ? service.description_gu : service.description_en}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-salon-border flex items-center justify-between text-xs">
                    <span className="text-salon-muted flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-salon-secondary" />
                      <span>{service.duration} mins</span>
                    </span>
                    <Link
                      to="/join"
                      className="text-salon-primary font-bold hover:text-salon-secondary"
                    >
                      Book &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Barbers on Floor Roster Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 pb-2 border-b border-salon-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-salon-primary tracking-tight flex items-center space-x-2">
              <Users className="w-5 h-5 text-salon-secondary" />
              <span>{t('home.barbers_title')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-salon-muted">
              {t('home.barbers_subtitle')}
            </p>
          </div>
          <span className="text-xs text-salon-secondary font-bold">
            {barbers.filter((b) => b.is_on_duty && !b.is_on_break).length} Stylists Available
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
                  to={`/join`}
                  className="text-salon-primary hover:text-salon-secondary font-bold hover:underline"
                >
                  Choose Barber &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Salon Details Footer Information */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-salon-border text-xs text-salon-muted">
        <div className="bg-salon-card p-4 rounded-xl border border-salon-border flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-salon-secondary flex-shrink-0" />
          <div>
            <p className="font-bold text-salon-primary">{t('home.hours_title')}</p>
            <p>{t('home.hours_val')}</p>
          </div>
        </div>
        <div className="bg-salon-card p-4 rounded-xl border border-salon-border flex items-center space-x-3">
          <MapPin className="w-5 h-5 text-salon-secondary flex-shrink-0" />
          <div>
            <p className="font-bold text-salon-primary">{t('home.location_title')}</p>
            <p>{t('home.location_val')}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
