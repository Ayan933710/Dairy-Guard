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
import LocationLink from '../shared/LocationLink.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { LogOut, BellRing } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext.jsx';
import { connectSocket, disconnectSocket } from '../../lib/socket.js';
import { api } from '../../lib/apiClient.js';

const NAV_ITEMS = [
  { to: '/', label: 'mainPage', icon: Home, end: true },
  { to: '/dashboard', label: 'herdOverview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/analytics', label: 'analytics', icon: LineChart },
  { to: '/dashboard/predictions', label: 'predictions', icon: AlertTriangle },
  { to: '/dashboard/history', label: 'history', icon: History },
  { to: '/dashboard/weekly-input', label: 'weeklyCheckIn', icon: ClipboardEdit },
  { to: '/dashboard/admin', label: 'accountOverview', icon: Users, roles: ['administrator'] },
];

const ANIMAL_ITEMS = [
  { to: '/dashboard/species/cow', label: 'Cows' },
  { to: '/dashboard/species/buffalo', label: 'Buffaloes' },
];

const VET_SECTION_ITEMS = [
  { id: 'main', label: 'mainPage', icon: Home },
  { id: 'overview', label: 'herdOverview', icon: ClipboardCheck },
  { id: 'maps', label: 'analytics', icon: MapPin },
  { id: 'recommendations', label: 'predictions', icon: AlertTriangle },
  { id: 'history', label: 'history', icon: HistoryIcon },
];

const ADMIN_SECTION_ITEMS = [
  { to: '/', label: 'mainPage', icon: Home, end: true },
  { to: '/dashboard/accounts', label: 'accountOverview', icon: Users },
  { to: '/dashboard/animals', label: 'animal', icon: PawPrint },
  { to: '/dashboard/regional-analysis', label: 'regionalAnalysis', icon: MapPin },
  { to: '/dashboard/analytics', label: 'analytics', icon: LineChart },
  { to: '/dashboard/admin-history', label: 'history', icon: History },
  { to: '/dashboard/vet-requests', label: 'vetRequests', icon: ClipboardCheck },
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
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isAccountEditing, setIsAccountEditing] = useState(false);
  const [accountForm, setAccountForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    farm_name: user?.farm_name || '',
    farm_id: user?.farm_id || '',
    vet_district: user?.vet_district || '',
    vet_designation: user?.vet_designation || '',
    registration_number: user?.registration_number || '',
  });
  const isVet = user?.role === 'vet';
  const isAdmin = user?.role === 'administrator';
  const isApprovedVet = isVet && user?.vet_approval_status === 'approved';
  const userRoleLabel = user?.role === 'administrator' ? 'Administrator' : user?.role === 'vet' ? 'Vet' : user?.role === 'cooperative_admin' ? 'Co-op Admin' : 'Farmer';
  const accountProfile = {
    full_name: accountForm.full_name || user?.full_name || 'User profile',
    email: accountForm.email || user?.email || 'Not provided',
    phone: accountForm.phone || user?.phone || 'Not provided',
    farm_name: accountForm.farm_name || user?.farm_name || '',
    farm_id: accountForm.farm_id || user?.farm_id || '',
    vet_district: accountForm.vet_district || user?.vet_district || '',
    vet_designation: accountForm.vet_designation || user?.vet_designation || '',
    registration_number: accountForm.registration_number || user?.registration_number || '',
  };
  const visibleNavItems = NAV_ITEMS.filter(({ to, roles }) => {
    if (roles && !roles.includes(user?.role)) return false;
    return to !== '/dashboard/weekly-input' || user?.role === 'farmer';
  });

  useEffect(() => {
    if (animalsActive) setAnimalsOpen(true);
  }, [animalsActive]);

  useEffect(() => {
    setAccountForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      farm_name: user?.farm_name || '',
      farm_id: user?.farm_id || '',
      vet_district: user?.vet_district || '',
      vet_designation: user?.vet_designation || '',
      registration_number: user?.registration_number || '',
    });
    setIsAccountEditing(false);
  }, [user?.id, user?.full_name, user?.email, user?.phone, user?.farm_name, user?.farm_id, user?.vet_district, user?.vet_designation, user?.registration_number]);

  useEffect(() => {
    const socket = connectSocket();
    const handleAlert = (alert) => setLiveAlert(alert);
    socket.on('alert:new', handleAlert);
    return () => {
      socket.off('alert:new', handleAlert);
      disconnectSocket();
    };
  }, []);

  async function handleLogout() {
    await api.post('/auth/logout', {}).catch(() => {});
    logout();
    navigate('/login');
  }

  return (
    <div className="relative flex min-h-screen isolate bg-theme-bg-main text-theme-text-dark">
      <AmbientBackground variant="dashboard" />
      <div className="dashboard-background-mesh" aria-hidden="true" />
      <aside className="z-10 dashboard-sidebar sticky top-0 hidden h-screen w-60 shrink-0 self-start border-r border-slate-200 bg-theme-bg-card px-4 py-6 shadow-sm md:flex md:flex-col">
        <div className="flex items-center gap-2 px-2">
          <span className="h-2.5 w-2.5 rounded-full bg-theme-primary" />
          <span className="font-display text-base text-theme-text-dark">
            NANDI
          </span>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {isAdmin && ADMIN_SECTION_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-sky-50 text-theme-primary' : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'}`}>
              <Icon size={16} /> {t(label)}
            </NavLink>
          ))}
          {!isVet && !isAdmin && NAV_ITEMS.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-sky-50 text-theme-primary' : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'}`} >
              <Icon size={16} />
              {to === '/' ? t('mainPage') : t('herdOverview')}
            </NavLink>
          ))}

          {!isVet && !isAdmin && <div className="pt-2">
            <button
              type="button"
              aria-expanded={animalsOpen}
              onClick={() => setAnimalsOpen((isOpen) => !isOpen)}
              className={`focus-ring flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${animalsActive ? 'text-theme-primary' : 'text-theme-text-muted'}`}
            >
              <span className="flex items-center gap-3">
                <PawPrint size={16} />
                <span>{t('animals')}</span>
              </span>
              <ChevronDown size={15} className={`transition-transform ${animalsOpen ? 'rotate-180' : ''}`} />
            </button>
            {animalsOpen && (
              <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
                {ANIMAL_ITEMS.map(({ to, label }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `focus-ring block rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-sky-50 text-theme-primary' : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'}`}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>}

          {isVet && isApprovedVet && VET_SECTION_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = id !== 'main' && (searchParams.get('section') || 'overview') === id;
            return (
              <NavLink key={id} to={id === 'main' ? '/' : id === 'overview' ? '/dashboard' : `/dashboard?section=${id}`} end={id === 'main'} className={({ isActive }) => {
                const isItemActive = id === 'main' ? isActive : active;
                return `focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isItemActive ? 'bg-sky-50 text-theme-primary' : 'text-theme-text-muted hover:bg-slate-50 hover:text-theme-text-dark'}`;
              }} onClick={() => {
                if (id === 'overview' || id === 'main') setSearchParams({});
              }} >
                <Icon size={16} /> {t(label)}
              </NavLink>
            );
          })}

          {!isVet && !isAdmin && visibleNavItems.slice(2).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-sky-50 text-theme-primary' : 'text-theme-text-muted hover:bg-sky-50/70 hover:text-theme-text-dark'}`}>
              <Icon size={16} />
              {to.endsWith('analytics') ? t('analytics') : to.endsWith('predictions') ? t('predictions') : to.endsWith('history') ? t('history') : to.endsWith('weekly-input') ? t('weeklyCheckIn') : t('vetRequests')}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 dark:border-slate-700/60 pt-4">
          <button type="button" onClick={() => { setIsAccountPanelOpen(true); setIsAccountEditing(false); }} className="focus-ring flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-2.5 text-left transition hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/80 dark:hover:bg-sky-900/40">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-theme-primary/10 text-[10px] font-bold text-theme-primary">
                {((accountProfile.full_name || 'U').split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('') || 'U').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">{t('myAccount') || 'My Account'}</p>
                <p className="truncate text-sm font-semibold text-theme-text-dark">{accountProfile.full_name}</p>
              </div>
            </div>
            <span className="text-lg text-theme-text-muted">→</span>
          </button>
        </div>
      </aside>

      {isAccountPanelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px]" onClick={() => setIsAccountPanelOpen(false)} aria-hidden="true" />
          <aside className="fixed right-0 top-0 z-50 flex h-screen w-[min(460px,92vw)] flex-col border-l border-slate-200 bg-theme-bg-card shadow-2xl shadow-slate-900/10" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">{t('myAccount') || 'My Account'}</p>
                <h2 className="mt-1 font-display text-2xl text-theme-text-dark">{accountProfile.full_name}</h2>
              </div>
              <button type="button" onClick={() => setIsAccountPanelOpen(false)} className="rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-theme-text-dark hover:border-slate-300 dark:hover:border-slate-600">Close</button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-theme-primary/10 text-sm font-bold text-theme-primary">
                    {((accountProfile.full_name || 'U').split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('') || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-theme-text-muted">Profile</p>
                    <p className="mt-1 font-semibold text-theme-text-dark">{userRoleLabel}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-theme-text-muted">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2.5">
                  <span>Email</span>
                  <span className="max-w-[220px] truncate text-right font-medium text-theme-text-dark">{accountProfile.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2.5">
                  <span>Phone</span>
                  <span className="font-medium text-theme-text-dark">{accountProfile.phone}</span>
                </div>
                {accountProfile.farm_name && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2.5">
                    <span>Farm</span>
                    <span className="max-w-[220px] truncate text-right font-medium text-theme-text-dark">{accountProfile.farm_name}</span>
                  </div>
                )}
                {accountProfile.farm_id && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2.5">
                    <span>Farm ID</span>
                    <span className="font-medium text-theme-text-dark">{accountProfile.farm_id}</span>
                  </div>
                )}
                {accountProfile.vet_district && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2.5">
                    <span>District</span>
                    <span className="font-medium text-theme-text-dark">{accountProfile.vet_district}</span>
                  </div>
                )}
                {accountProfile.registration_number && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2.5">
                    <span>Reg no.</span>
                    <span className="font-medium text-theme-text-dark">{accountProfile.registration_number}</span>
                  </div>
                )}
              </div>

              <form className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-4" onSubmit={(event) => { event.preventDefault(); setIsAccountEditing(false); setIsAccountPanelOpen(false); }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-theme-text-dark">Edit details</h3>
                  <button type="button" onClick={() => setIsAccountEditing((current) => !current)} className="rounded-md border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-theme-text-dark">{isAccountEditing ? 'Cancel edit' : 'Edit'}</button>
                </div>

                {isAccountEditing ? (
                  <>
                    <label className="block text-xs text-theme-text-muted">
                      <span className="mb-1 block">Full name</span>
                      <input className="w-full rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-theme-text-dark outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900" value={accountForm.full_name} onChange={(event) => setAccountForm((current) => ({ ...current, full_name: event.target.value }))} />
                    </label>
                    <label className="block text-xs text-theme-text-muted">
                      <span className="mb-1 block">Email</span>
                      <input className="w-full rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-theme-text-dark outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900" value={accountForm.email} onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} />
                    </label>
                    <label className="block text-xs text-theme-text-muted">
                      <span className="mb-1 block">Phone</span>
                      <input className="w-full rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-theme-text-dark outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900" value={accountForm.phone} onChange={(event) => setAccountForm((current) => ({ ...current, phone: event.target.value }))} />
                    </label>
                    {(user?.role === 'farmer' || user?.role === 'cooperative_admin') && (
                      <label className="block text-xs text-theme-text-muted">
                        <span className="mb-1 block">Farm name</span>
                        <input className="w-full rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-theme-text-dark outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900" value={accountForm.farm_name} onChange={(event) => setAccountForm((current) => ({ ...current, farm_name: event.target.value }))} />
                      </label>
                    )}
                    {user?.role === 'vet' && (
                      <>
                        <label className="block text-xs text-theme-text-muted">
                          <span className="mb-1 block">Designation</span>
                          <input className="w-full rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-theme-text-dark outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900" value={accountForm.vet_designation} onChange={(event) => setAccountForm((current) => ({ ...current, vet_designation: event.target.value }))} />
                        </label>
                        <label className="block text-xs text-theme-text-muted">
                          <span className="mb-1 block">District</span>
                          <input className="w-full rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-theme-text-dark outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900" value={accountForm.vet_district} onChange={(event) => setAccountForm((current) => ({ ...current, vet_district: event.target.value }))} />
                        </label>
                      </>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="rounded-lg bg-theme-primary px-3 py-2 text-sm font-medium text-white hover:bg-sky-600">Save changes</button>
                      <button type="button" onClick={() => {
                        setAccountForm({
                          full_name: user?.full_name || '',
                          email: user?.email || '',
                          phone: user?.phone || '',
                          farm_name: user?.farm_name || '',
                          farm_id: user?.farm_id || '',
                          vet_district: user?.vet_district || '',
                          vet_designation: user?.vet_designation || '',
                          registration_number: user?.registration_number || '',
                        });
                        setIsAccountEditing(false);
                      }} className="rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-theme-text-dark">Reset</button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-theme-text-muted">Use Edit to update your account information.</p>
                )}
              </form>
            </div>
          </aside>
        </>
      )}

      <div className="relative z-10 min-w-0 flex-1">
        <header className="dashboard-topbar sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-theme-bg-card px-4 py-4 shadow-sm sm:px-6 md:px-8">
          <div className="min-w-0">
            {!isVet && !isAdmin && <p className="dashboard-kicker text-xs text-theme-text-muted">{t('cooperative')}</p>}
            <p className="truncate font-display text-lg text-theme-text-dark">{isAdmin ? t('adminConsole') : isVet ? t('vetConsole') : t('healthConsole')}</p>
          </div>
          {!isVet && !isAdmin && <div className="dashboard-status flex shrink-0 items-center gap-2 text-xs text-theme-text-muted">
            <span className="h-2 w-2 rounded-full bg-theme-risk-none" />
            {t('gatewayOnline')}
          </div>}
          <div className="dashboard-header-controls flex items-center gap-3">
            {user && (
              <span className="hidden text-xs text-theme-text-muted sm:inline">
                {user.full_name} <span className="capitalize text-theme-text-dark">({user.role.replace('_', ' ')})</span>
                {user.farm_id && <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] tracking-wide text-theme-text-dark">ID: {user.farm_id}</span>}
                {isVet && user.registration_number && <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] tracking-wide text-theme-text-dark">Reg: {user.registration_number}</span>}
                {user.hub_latitude != null && user.hub_longitude != null && <LocationLink className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] tracking-wide text-theme-text-dark" latitude={user.hub_latitude} longitude={user.hub_longitude} />}
              </span>
            )}
            <ThemeToggle />
            <LanguageSelect />
            <button type="button" onClick={handleLogout} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-theme-text-muted transition hover:border-red-300 hover:text-red-500">
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
          {isAdmin ? ADMIN_SECTION_ITEMS.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `dashboard-mobile-link ${isActive ? 'is-active' : ''}`}><Icon size={15} /><span>{t(label)}</span></NavLink>) : isVet ? (isApprovedVet ? VET_SECTION_ITEMS.map(({ id, label, icon: Icon }) => <NavLink key={id} to={id === 'main' ? '/' : id === 'overview' ? '/dashboard' : `/dashboard?section=${id}`} end={id === 'main'} className={({ isActive }) => `dashboard-mobile-link ${isActive ? 'is-active' : ''}`}><Icon size={15} /><span>{t(label)}</span></NavLink>) : null) : visibleNavItems.slice(1).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `dashboard-mobile-link ${isActive ? 'is-active' : ''}`}>
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
