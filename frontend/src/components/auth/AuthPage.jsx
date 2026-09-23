import { useEffect, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Leaf, LockKeyhole, Mail, Phone, ShieldCheck, Play } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ThemeToggle from '../shared/ThemeToggle.jsx';
import LanguageSelect from '../shared/LanguageSelect.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { useAuth } from '../../lib/AuthContext.jsx';
import { getCustomApiUrl, setCustomApiUrl, getApiUrls } from '../../lib/apiClient.js';

const ROLES = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'vet', label: 'Vet' },
  { value: 'cooperative_admin', label: 'CoopAdmin' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

const VET_DESIGNATIONS = ['VO (Veterinary Officer)', 'SVO (Senior Veterinary Officer)', 'AH (Animal Husbandry)', 'Other'];

export default function AuthPage() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, isAuthenticated, status } = useAuth();
  const routeMode = location.pathname === '/signup' ? 'signup' : 'login';
  const [activeMode, setActiveMode] = useState(routeMode);
  const mode = activeMode;
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [issuedFarmId, setIssuedFarmId] = useState('');
  const [farmIdCopied, setFarmIdCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState('farmer');
  const [vetDesignationChoice, setVetDesignationChoice] = useState('');
  const [customVetDesignation, setCustomVetDesignation] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(language);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const baseUrl = getCustomApiUrl() || getApiUrls()[0] || 'http://172.16.60.135:5000/api';
        // Remove /api if it's there to hit /api/config cleanly
        const base = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
        const res = await fetch(`${base}/api/config`);
        const data = await res.json();
        if (data.demoVideoUrl) setDemoVideoUrl(data.demoVideoUrl);
      } catch (err) {
        console.error('Failed to fetch config:', err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (isAuthenticated && status === 'authenticated' && !submitted) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, status, submitted, navigate]);

  useEffect(() => {
    setActiveMode(routeMode);
    setSubmitted(false);
    setFormError('');
    setTermsAccepted(false);
  }, [routeMode]);

  function switchMode(nextMode) {
    if (nextMode === mode) return;
    setSubmitted(false);
    setFormError('');
    setTermsAccepted(false);
    setActiveMode(nextMode);
    navigate(`/${nextMode}`, { replace: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);

    try {
      setIsSubmitting(true);
      if (mode === 'login') {
        await login({
          identifier: form.get('identifier'),
          password: form.get('password'),
        });
        navigate('/dashboard', { replace: true });
        return;
      } else {
        const resolvedVetDesignation = form.get('role') === 'vet'
          ? (vetDesignationChoice === 'Other' ? customVetDesignation.trim() : (form.get('vet_designation') || '').toString().trim())
          : undefined;

        const newUser = await register({
          full_name: form.get('full_name'),
          email: form.get('email'),
          password: form.get('password'),
          role: form.get('role') || 'farmer',
          phone: form.get('phone'),
          farm_name: form.get('farm_name') || undefined,
          vet_state: form.get('vet_state') || undefined,
          vet_district: form.get('vet_district') || undefined,
          vet_designation: resolvedVetDesignation || undefined,
          registration_number: form.get('registration_number') || undefined,
          preferred_language: preferredLanguage,
        });
        setIssuedFarmId(newUser.farm_id || '');
      }
      setSubmitted(true);
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-atmosphere auth-atmosphere-one" aria-hidden="true" />
      <div className="auth-atmosphere auth-atmosphere-two" aria-hidden="true" />
      <header className="auth-header">
        <Link to="/" className="auth-brand" aria-label="NANDI home">
          <img
            src="/brand-icon.png"
            alt="NANDI logo"
            className="h-7 w-7 rounded-full border border-sky-400/50 bg-white object-contain p-0.5 shadow-sm"
          />
          <span className="font-display text-lg tracking-tight">NANDI</span>
        </Link>
        <div className="flex items-center gap-4">
          {demoVideoUrl && (
            <a href={demoVideoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition">
              <Play size={14} /> Watch Demo
            </a>
          )}
          <LanguageSelect />
          <ThemeToggle />
          <Link to="/" className="auth-home-link">{t('backHome')} <ArrowRight size={15} /></Link>
        </div>
      </header>

      <div className="auth-center auth-center-card">
        <motion.div layout className={`auth-card-shell auth-card-${mode} ${submitted ? 'auth-card-submitted' : ''}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ layout: { type: 'spring', stiffness: 240, damping: 28 }, opacity: { duration: .5 }, y: { duration: .5, ease: 'easeOut' } }}>
          <motion.section layout transition={{ layout: { type: 'spring', stiffness: 240, damping: 28 } }} className="auth-form-panel">
          <AnimatePresence mode="wait" initial={false}>
          {submitted ? (
            <div className="auth-success" role="status">
              <span className="auth-success-icon"><Check size={20} /></span>
              <h2>{mode === 'login' ? t('allSet') : t('workspaceReceived')}</h2>
              <p>{t('prototypeReady')}</p>
              {mode === 'signup' && issuedFarmId && (
                <div className="auth-farm-id-box mt-4 rounded-lg border border-milk/15 bg-night-card/60 p-4 text-left">
                  <p className="text-xs uppercase tracking-wide text-milk-dim">{t('farmIdIssued')}</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-display text-2xl tracking-widest text-milk">{issuedFarmId}</span>
                    <button
                      type="button"
                      className="dashboard-secondary-button text-xs"
                      onClick={() => {
                        navigator.clipboard?.writeText(issuedFarmId);
                        setFarmIdCopied(true);
                        setTimeout(() => setFarmIdCopied(false), 2000);
                      }}
                    >
                      {farmIdCopied ? t('copiedFarmId') : t('copyFarmId')}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-milk-dim">{t('farmIdExplain')}</p>
                </div>
              )}
              <button type="button" className="auth-submit" onClick={() => navigate('/dashboard')}>{t('enterPlatform')} <ArrowRight size={17} /></button>
            </div>
          ) : (
            <motion.div key={mode} initial={{ opacity: 0, x: mode === 'login' ? -18 : 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === 'login' ? 18 : -18 }} transition={{ duration: .28, ease: 'easeOut' }}>
            <div className="auth-form-heading"><span>{mode === 'login' ? t('welcomeBack') : t('createWorkspace')}</span><i /></div>
            <form className={`auth-form ${mode === 'signup' ? 'auth-form-signup' : ''}`} onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <>
                  <label><span>{t('fullName')}</span><div className="auth-input-wrap"><Leaf size={16} /><input name="full_name" type="text" placeholder={t('yourName')} required /></div></label>
                  <label>
                    <span>{t('roleLabel')}</span>
                    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Account type">
                      {ROLES.map((r) => (
                        <button key={r.value} type="button" role="radio" aria-checked={selectedRole === r.value} onClick={() => setSelectedRole(r.value)} className={`rounded-lg border px-3 py-3 text-left text-sm transition ${selectedRole === r.value ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'}`}>
                          <span className="block font-semibold">{r.label}</span>
                          <span className="mt-1 block text-xs opacity-75">{r.value === 'farmer' ? 'Manage your own herd' : r.value === 'vet' ? 'Serve a district' : 'Oversee a cooperative herd'}</span>
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name="role" value={selectedRole} />
                  </label>
                  {selectedRole === 'vet' && (
                    <>
                      <label><span>Vet Officer State</span><div className="auth-input-wrap"><Leaf size={16} /><input name="vet_state" type="text" list="indian-states" placeholder="Search or select a state" required /></div><datalist id="indian-states">{INDIAN_STATES.map((state) => <option key={state} value={state} />)}</datalist></label>
                      <label><span>Vet Officer District</span><div className="auth-input-wrap"><Leaf size={16} /><input name="vet_district" type="text" placeholder="District" required /></div></label>
                      <label><span>Designation</span><select name="vet_designation" value={vetDesignationChoice} onChange={(event) => setVetDesignationChoice(event.target.value)} className="auth-select" required><option value="" disabled>Select designation</option>{VET_DESIGNATIONS.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</select></label>
                      {vetDesignationChoice === 'Other' && (
                        <label><span>Custom designation</span><div className="auth-input-wrap"><ShieldCheck size={16} /><input type="text" value={customVetDesignation} onChange={(event) => setCustomVetDesignation(event.target.value)} placeholder="Write your desired designation" required /></div></label>
                      )}
                      <label><span>Registration Number</span><div className="auth-input-wrap"><ShieldCheck size={16} /><input name="registration_number" type="text" placeholder="Veterinary registration number" required /></div></label>
                    </>
                  )}
                  <label><span>{t('farmNameLabel')}</span><div className="auth-input-wrap"><Leaf size={16} /><input name="farm_name" type="text" placeholder={t('farmNamePlaceholder')} /></div></label>
                  <label>
                    <span>{t('phoneLabel')}</span>
                    <div className="auth-input-wrap"><Phone size={16} /><input name="phone" type="tel" placeholder={t('identifierPlaceholder')} required /></div>
                  </label>
                  <label><span>{t('emailLabel')} ({t('optional')})</span><div className="auth-input-wrap"><Mail size={16} /><input name="email" type="email" placeholder={t('emailPlaceholder')} /></div></label>
                  <label><span>{t('alertLanguage')}</span><select name="preferred_language" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} className="auth-select"><option value="en">English</option><option value="hi">हिन्दी</option><option value="kn">ಕನ್ನಡ</option></select></label>
                </>
              )}
              {mode === 'login' && (
                <label><span>{t('signInIdentifierLabel')}</span><div className="auth-input-wrap"><Mail size={16} /><input name="identifier" type="text" placeholder={t('signInIdentifierPlaceholder')} required /></div></label>
              )}
              <label><span>{t('password')}</span><div className="auth-input-wrap"><LockKeyhole size={16} /><input name="password" type={showPassword ? 'text' : 'password'} placeholder={t('passwordPlaceholder')} minLength="8" required /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
              {mode === 'login' ? <div className="auth-form-meta"><label className="auth-check"><input type="checkbox" /> <span>{t('rememberMe')}</span></label><button type="button" className="auth-text-button">{t('forgotPassword')}</button></div> : <label className="auth-check auth-terms-check"><input name="termsAccepted" type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required /> <span>{t('acceptTerms')}</span></label>}
              {formError && (
                <div style={{ margin: '8px 0', textAlign: 'center' }}>
                  <p className="dashboard-form-error" role="alert">{formError}</p>
                </div>
              )}
              <div style={{ margin: '6px 0 10px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const current = getCustomApiUrl() || getApiUrls()[0] || 'http://172.16.60.135:5000/api';
                    const entered = window.prompt('Enter your computer Backend URL (e.g. http://172.16.60.135:5000):', current);
                    if (entered !== null && entered.trim()) {
                      setCustomApiUrl(entered.trim());
                      setFormError(null);
                    }
                  }}
                  style={{ background: 'none', border: '1px dashed rgba(16, 185, 129, 0.4)', borderRadius: '6px', padding: '4px 10px', color: '#10b981', fontSize: '11px', cursor: 'pointer' }}
                >
                  📡 Backend: {getCustomApiUrl() || getApiUrls()[0] || 'http://172.16.60.135:5000'} (Tap to edit)
                </button>
              </div>
              <button type="submit" className="auth-submit" disabled={isSubmitting || (mode === 'signup' && !termsAccepted)}>
                {isSubmitting ? t('pleaseWait') : mode === 'login' ? t('signIn') : t('createAccount')} <ArrowRight size={17} />
              </button>
              {mode === 'login' && (
                <p className="mt-3 text-xs text-milk-dim">
                  {t('demoAccountsNote')}
                </p>
              )}
            </form>
            </motion.div>
          )}
          </AnimatePresence>
          </motion.section>
          {!submitted && (
            <motion.section layout transition={{ layout: { type: 'spring', stiffness: 240, damping: 28 } }} className="auth-welcome-panel">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  className="auth-welcome-content"
                  initial={{ opacity: 0, x: mode === 'login' ? 22 : -22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'login' ? -22 : 22 }}
                  transition={{ duration: .34, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="auth-welcome-icon">{mode === 'login' ? <Leaf size={24} /> : <ShieldCheck size={24} />}</span>
                  <span className="auth-welcome-kicker">NANDI</span>
                  <h1>{mode === 'login' ? t('welcomeBackBang') : t('helloPartner')}</h1>
                  <p>{mode === 'login' ? t('loginDescription') : t('signupDescription')}</p>
                  <button type="button" className="auth-outline-button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
                    {mode === 'login' ? t('signup') : t('login')} <ArrowRight size={16} />
                  </button>
                </motion.div>
              </AnimatePresence>
            </motion.section>
          )}
        </motion.div>
      </div>
    </main>
  );
}
