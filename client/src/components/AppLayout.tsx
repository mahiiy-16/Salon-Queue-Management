import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scissors, Menu, X, Radio, Clock, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSocket } from '../contexts/SocketContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, t } = useLanguage();
  const { isConnected } = useSocket();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTvDisplay = location.pathname === '/display';

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/join', label: t('nav.join') },
    { path: '/status/S-14', label: t('nav.status') },
    { path: '/reception', label: t('nav.reception') },
    { path: '/barber/vikram', label: t('nav.barber') },
    { path: '/display', label: t('nav.display') },
    { path: '/admin', label: t('nav.admin') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-salon-bg text-salon-text selection:bg-salon-accent selection:text-salon-primary">
      {/* Top Navigation Header */}
      <header className="bg-salon-card border-b border-salon-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-salon-primary flex items-center justify-center text-salon-bg shadow-md group-hover:bg-salon-primary-hover transition-colors duration-200">
                  <Scissors className="w-5 h-5 text-salon-accent transform -rotate-45" />
                </div>
                <div>
                  <span className="text-lg md:text-xl font-bold tracking-tight text-salon-primary group-hover:text-salon-secondary transition">
                    {t('salon_name')}
                  </span>
                  <p className="text-[10px] uppercase tracking-widest text-salon-secondary font-semibold hidden sm:block">
                    {t('tagline')}
                  </p>
                </div>
              </Link>

              {/* Status Badges */}
              <div className="hidden lg:flex items-center space-x-2 ml-4">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t('queue_open')}</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-salon-bg text-salon-muted border border-salon-border">
                  <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>{isConnected ? t('live_connected') : t('live_disconnected')}</span>
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((item) => {
                const isActive = location.pathname === item.path || (item.path.startsWith('/status') && location.pathname.startsWith('/status'));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-150 ${
                      isActive
                        ? 'bg-salon-primary text-salon-card shadow-sm'
                        : 'text-salon-muted hover:text-salon-primary hover:bg-salon-bg'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls: Language Toggle & Mobile Hamburger */}
            <div className="flex items-center space-x-3">
              {/* Language Switcher */}
              <div className="flex items-center rounded-lg bg-salon-bg border border-salon-border p-1 text-xs font-medium shadow-inner">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-md transition duration-150 ${
                    language === 'en'
                      ? 'bg-salon-primary text-salon-card font-bold shadow-sm'
                      : 'text-salon-muted hover:text-salon-primary'
                  }`}
                  aria-label="Switch to English"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('gu')}
                  className={`px-2.5 py-1 rounded-md transition duration-150 ${
                    language === 'gu'
                      ? 'bg-salon-primary text-salon-card font-bold shadow-sm'
                      : 'text-salon-muted hover:text-salon-primary'
                  }`}
                  aria-label="ગુજરાતી ભાષા પસંદ કરો"
                >
                  ગુજરાતી
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-salon-muted hover:text-salon-primary hover:bg-salon-bg focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-salon-border bg-salon-card px-4 pt-3 pb-4 space-y-1">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-salon-border text-xs">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{t('queue_open')}</span>
              </span>
              <span className="text-salon-muted text-xs">
                {isConnected ? `● ${t('live_connected')}` : `○ ${t('live_disconnected')}`}
              </span>
            </div>

            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  location.pathname === item.path
                    ? 'bg-salon-primary text-salon-card font-bold'
                    : 'text-salon-muted hover:bg-salon-bg hover:text-salon-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main Screen Content */}
      <main className={`flex-1 w-full mx-auto ${isTvDisplay ? 'p-0 max-w-full' : 'max-w-7xl p-4 sm:p-6 lg:p-8'}`}>
        {children}
      </main>

      {/* Shared Footer (hidden on Fullscreen TV view) */}
      {!isTvDisplay && (
        <footer className="bg-salon-card border-t border-salon-border py-6 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-salon-muted">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-salon-secondary" />
              <span>{t('home.hours_val')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-3.5 h-3.5 text-salon-secondary" />
              <span>{t('home.location_val')}</span>
            </div>
            <div className="text-salon-muted text-center md:text-right">
              <span>{t('salon_name')} • MSc IT Capstone Project</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
