import { useEffect, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Leaf, LockKeyhole, Mail, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ThemeToggle from '../shared/ThemeToggle.jsx';
import LanguageSelect from '../shared/LanguageSelect.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { useAuth } from '../../lib/AuthContext.jsx';

const ROLES = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'vet', label: 'Vet' },
  { value: 'cooperative_admin', label: 'CoopAdmin' },
];

export default function AuthPage() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
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
  const [preferredLanguage, setPreferredLanguage] = useState(language);

  useEffect(() => {
    setActiveMode(routeMode);
    setSubmitted(false);
    setFormError('');
  }, [routeMode]);

  function switchMode(nextMode) {
    if (nextMode === mode) return;
    setSubmitted(false);
    setFormError('');
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
      } else {
        const newUser = await register({
          full_name: form.get('full_name'),
          email: form.get('email'),
          password: form.get('password'),
          role: form.get('role') || 'farmer',
          phone: form.get('phone'),
          farm_name: form.get('farm_name') || undefined,
          vet_state: form.get('vet_state') || undefined,
          vet_district: form.get('vet_district') || undefined,
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
        <Link to="/" className="auth-brand" aria-label="DairyGuard home">
          <span className="brand-mark"><span /></span>
          <span className="font-display text-lg tracking-tight">DairyGuard <b>AI</b></span>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSelect />
          <ThemeToggle />
          <Link to="/" className="auth-home-link">{t('backHome')} <ArrowRight size={15} /></Link>
        </div>
      </header>

      <div className="auth-center auth-center-card">
        <motion.div className="auth-top-copy" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
          <span><Sparkles size={13} /> {t('earlyCare')}</span>
          <p>{t('authIntro')}</p>
        </motion.div>
        <motion.div layout className={`auth-card-shell auth-card-${mode}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ layout: { type: 'spring', stiffness: 240, damping: 28 }, opacity: { duration: .5 }, y: { duration: .5, ease: 'easeOut' } }}>
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
            <form className="auth-form" onSubmit={handleSubmit}>
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
                      <label><span>Vet Officer State</span><div className="auth-input-wrap"><Leaf size={16} /><input name="vet_state" type="text" placeholder="State" required /></div></label>
                      <label><span>Vet Officer District</span><div className="auth-input-wrap"><Leaf size={16} /><input name="vet_district" type="text" placeholder="District" required /></div></label>
                      <label><span>Registration Number</span><div className="auth-input-wrap"><ShieldCheck size={16} /><input name="registration_number" type="text" placeholder="Veterinary registration number" required /></div></label>
                    </>
                  )}
                  <label><span>{t('farmNameLabel')}</span><div className="auth-input-wrap"><Leaf size={16} /><input name="farm_name" type="text" placeholder={t('farmNamePlaceholder')} /></div></label>
                  <label>
                    <span>{t('phoneLabel')}</span>
                    <div className="auth-input-wrap"><Phone size={16} /><input name="phone" type="tel" placeholder={t('identifierPlaceholder')} required /></div>
                    <small className="mt-1 block text-xs text-milk-dim">{t('phoneRequiredNote')}</small>
                  </label>
                  <label><span>{t('emailLabel')} ({t('optional')})</span><div className="auth-input-wrap"><Mail size={16} /><input name="email" type="email" placeholder={t('emailPlaceholder')} /></div></label>
                  <label><span>{t('alertLanguage')}</span><select name="preferred_language" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)} className="auth-input-wrap" style={{ width: '100%', padding: '0.6rem 0.75rem' }}><option value="en">English</option><option value="hi">हिन्दी</option><option value="kn">ಕನ್ನಡ</option></select><small className="mt-1 block text-xs text-milk-dim">{t('alertLanguageHelp')}</small></label>
                </>
              )}
              {mode === 'login' && (
                <label><span>{t('signInIdentifierLabel')}</span><div className="auth-input-wrap"><Mail size={16} /><input name="identifier" type="text" placeholder={t('signInIdentifierPlaceholder')} required /></div></label>
              )}
              <label><span>{t('password')}</span><div className="auth-input-wrap"><LockKeyhole size={16} /><input name="password" type={showPassword ? 'text' : 'password'} placeholder={t('passwordPlaceholder')} minLength="8" required /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
              {mode === 'login' ? <div className="auth-form-meta"><label className="auth-check"><input type="checkbox" /> <span>{t('rememberMe')}</span></label><button type="button" className="auth-text-button">{t('forgotPassword')}</button></div> : <p className="auth-terms">{t('terms')}</p>}
              {formError && <p className="dashboard-form-error" role="alert">{formError}</p>}
              <button type="submit" className="auth-submit" disabled={isSubmitting}>
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
                <span className="auth-welcome-kicker">DairyGuard AI</span>
                <h1>{mode === 'login' ? t('welcomeBackBang') : t('helloPartner')}</h1>
                <p>{mode === 'login' ? t('loginDescription') : t('signupDescription')}</p>
                <button type="button" className="auth-outline-button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
                  {mode === 'login' ? t('signup') : t('login')} <ArrowRight size={16} />
                </button>
              </motion.div>
            </AnimatePresence>
          </motion.section>
        </motion.div>
      </div>
    </main>
  );
}
