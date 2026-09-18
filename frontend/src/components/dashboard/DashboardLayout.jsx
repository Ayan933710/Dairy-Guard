import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  ChevronDown,
  Home,
  PawPrint,
  LineChart,
  History,
  ClipboardEdit,
  Users,
  ClipboardCheck,
  MapPin,
  History as HistoryIcon,
} from 'lucide-react';
import AmbientBackground from '../shared/AmbientBackground.jsx';
import ThemeToggle from '../shared/ThemeToggle.jsx';
import LanguageSelect from '../shared/LanguageSelect.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { LogOut, BellRing } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext.jsx';
import { connectSocket, disconnectSocket } from '../../lib/socket.js';

const NAV_ITEMS = [
  { to: '/', label: 'Main Page', icon: Home, end: true },
  { to: '/dashboard', label: 'Herd Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/analytics', label: 'Analytics', icon: LineChart },
  { to: '/dashboard/predictions', label: 'Predictions', icon: AlertTriangle },
  { to: '/dashboard/history', label: 'History', icon: History },
  { to: '/dashboard/weekly-input', label: 'Weekly check-in', icon: ClipboardEdit },
  { to: '/dashboard/admin', label: 'Administrator', icon: Users, roles: ['administrator'] },
];

const ANIMAL_ITEMS = [
  { to: '/dashboard/species/cow', label: 'Cows' },
  { to: '/dashboard/species/buffalo', label: 'Buffaloes' },
];

const VET_SECTION_ITEMS = [
  { id: 'overview', label: 'Farm Overview', icon: ClipboardCheck },
  { id: 'maps', label: 'Analytics', icon: MapPin },
  { id: 'recommendations', label: 'Recommendations', icon: AlertTriangle },
  { id: 'history', label: 'History', icon: HistoryIcon },
];

export default function DashboardLayout() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const animalsActive = pathname.startsWith('/dashboard/species/');
  const [animalsOpen, setAnimalsOpen] = useState(animalsActive);
  const [liveAlert, setLiveAlert] = useState(null);
  const isVet = user?.role === 'vet';
  const isApprovedVet = isVet && user?.vet_approval_status === 'approved';
  const visibleNavItems = NAV_ITEMS.filter(({ to, roles }) => {
    if (roles && !roles.includes(user?.role)) return false;
    return to !== '/dashboard/weekly-input' || user?.role === 'farmer';
  });

  useEffect(() => {
    if (animalsActive) setAnimalsOpen(true);
  }, [animalsActive]);

  // Real-time socket connection - shows a dismissible banner whenever the
  // backend pushes an 'alert:new' event (an animal just crossed into High Risk).
  useEffect(() => {
    const socket = connectSocket();
    const handleAlert = (alert) => setLiveAlert(alert);
    socket.on('alert:new', handleAlert);
    return () => {
      socket.off('alert:new', handleAlert);
      disconnectSocket();
    };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="relative flex min-h-screen isolate bg-theme-bg-main text-theme-text-dark">
      <AmbientBackground variant="dashboard" />
      <div className="dashboard-background-mesh" aria-hidden="true" />
      <aside className="z-10 dashboard-sidebar sticky top-0 hidden h-screen w-60 shrink-0 self-start border-r border-slate-200 bg-theme-bg-card px-4 py-6 shadow-sm md:block">
        <div className="flex items-center gap-2 px-2">
          <span className="h-2.5 w-2.5 rounded-full bg-theme-primary" />
          <span className="font-display text-base text-theme-text-dark">
            DairyGuard <span className="text-theme-primary">AI</span>
          </span>
        </div>

        <nav className="mt-8 space-y-1">
          {!isVet && NAV_ITEMS.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                      ? 'bg-sky-50 text-theme-primary'
                    : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'
                }`
              }
            >
              <Icon size={16} />
              {to === '/' ? t('mainPage') : t('herdOverview')}
            </NavLink>
          ))}

          {!isVet && <div className="pt-2">
            <button
              type="button"
              aria-expanded={animalsOpen}
              onClick={() => setAnimalsOpen((isOpen) => !isOpen)}
              className={`focus-ring flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                animalsActive ? 'text-theme-primary' : 'text-theme-text-muted'
              }`}
            >
              <span className="flex items-center gap-3">
                <PawPrint size={16} />
                <span>{t('animals')}</span>
              </span>
              <ChevronDown
                size={15}
                className={`transition-transform ${animalsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {animalsOpen && (
              <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
                {ANIMAL_ITEMS.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `focus-ring block rounded-lg px-3 py-2 text-sm transition ${
                        isActive
                          ? 'bg-sky-50 text-theme-primary'
                          : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>}

          {isVet && isApprovedVet && (
            <NavLink to="/dashboard" end className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-sky-50 text-theme-primary' : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'}`}>
              <LayoutDashboard size={16} /> Veterinary Console
            </NavLink>
          )}

          {isVet && isApprovedVet && (
            <div className="ml-2 mt-2 space-y-1 border-l border-slate-300 pl-3">
              {VET_SECTION_ITEMS.map(({ id, label, icon: Icon }) => {
                const active = (searchParams.get('section') || 'overview') === id;
                return (
                  <NavLink
                    key={id}
                    to={id === 'overview' ? '/dashboard' : `/dashboard?section=${id}`}
                    className={`focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-sky-50 text-theme-primary' : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'}`}
                    onClick={() => {
                      if (id === 'overview') setSearchParams({});
                    }}
                  >
                    <Icon size={15} /> {label}
                  </NavLink>
                );
              })}
            </div>
          )}

          {!isVet && visibleNavItems.slice(2).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-sky-50 text-theme-primary'
                    : 'text-theme-text-muted hover:bg-sky-50/70 hover:text-theme-text-dark'
                }`
              }
            >
              <Icon size={16} />
              {to.endsWith('analytics') ? t('analytics') : to.endsWith('predictions') ? t('predictions') : to.endsWith('history') ? t('history') : to.endsWith('weekly-input') ? t('weeklyCheckIn') : t('vetRequests')}
            </NavLink>
          ))}
        </nav>

      </aside>

      <div className="relative z-10 min-w-0 flex-1">
        <header className="dashboard-topbar sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-theme-bg-card px-4 py-4 shadow-sm sm:px-6 md:px-8">
          <div className="min-w-0">
            <p className="dashboard-kicker text-xs text-theme-text-muted">{t('cooperative')}</p>
            <p className="truncate font-display text-lg text-theme-text-dark">{t('healthConsole')}</p>
          </div>
          {!isVet && <div className="dashboard-status flex shrink-0 items-center gap-2 text-xs text-theme-text-muted">
            <span className="h-2 w-2 rounded-full bg-theme-risk-none" />
            {t('gatewayOnline')}
          </div>}
          <div className="dashboard-header-controls flex items-center gap-3">
            {user && (
              <span className="hidden text-xs text-theme-text-muted sm:inline">
                {user.full_name} <span className="capitalize text-theme-text-dark">({user.role.replace('_', ' ')})</span>
                {user.farm_id && <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] tracking-wide text-theme-text-dark">ID: {user.farm_id}</span>}
                {user.hub_latitude != null && user.hub_longitude != null && <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] tracking-wide text-theme-text-dark">{Number(user.hub_latitude).toFixed(4)}, {Number(user.hub_longitude).toFixed(4)}</span>}
              </span>
            )}
            <ThemeToggle />
            <LanguageSelect />
            <button
              type="button"
              onClick={handleLogout}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-theme-text-muted transition hover:border-red-300 hover:text-red-500"
            >
              <LogOut size={14} /> {t('logOut')}
            </button>
          </div>
        </header>

        {liveAlert && (
          <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100 sm:mx-6 md:mx-8" role="alert">
            <BellRing size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('liveAlertLabel')}</p>
              <p className="text-amber-100/90">{liveAlert.message}</p>
            </div>
            <button type="button" className="text-amber-200/70 hover:text-amber-100" onClick={() => setLiveAlert(null)} aria-label="Dismiss alert">
              ✕
            </button>
          </div>
        )}

        <nav className="dashboard-mobile-nav md:hidden" aria-label="Dashboard navigation">
          {isVet ? (isApprovedVet ? <NavLink to="/dashboard" end className={({ isActive }) => `dashboard-mobile-link ${isActive ? 'is-active' : ''}`}><LayoutDashboard size={15} /><span>Veterinary Console</span></NavLink> : null) : visibleNavItems.slice(1).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `dashboard-mobile-link ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={15} />
              <span>{to.endsWith('analytics') ? t('analytics') : to.endsWith('predictions') ? t('predictions') : to.endsWith('history') ? t('history') : to.endsWith('weekly-input') ? t('weeklyCheckIn') : to.endsWith('vet-requests') ? t('vetRequests') : t('herdOverview')}</span>
            </NavLink>
          ))}
        </nav>

        <main className="dashboard-main min-w-0 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
