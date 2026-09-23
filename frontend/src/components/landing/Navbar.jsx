import { motion } from 'framer-motion';
import MagneticButton from '../shared/MagneticButton.jsx';
import ThemeToggle from '../shared/ThemeToggle.jsx';
import LanguageSelect from '../shared/LanguageSelect.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';

export default function Navbar({ onLogin, onSignup, onEnterPlatform }) {
  const { t } = useLanguage();
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="landing-nav absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 md:px-12 lg:px-16"
    >
      <div className="flex items-center gap-2.5">
        <img
          src="/brand-icon.png"
          alt="NANDI logo"
          className="h-7 w-7 rounded-full border border-sky-400/50 bg-white object-contain p-0.5 shadow-sm transition-transform hover:scale-105"
        />
        <span className="brand-name font-display text-lg tracking-tight">
          NANDI
        </span>
      </div>

      <nav className="flex items-center gap-2 sm:gap-3">
        <LanguageSelect />
        <ThemeToggle />
        <MagneticButton
          type="button"
          onClick={onLogin}
          className="focus-ring hidden rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-600 sm:block"
        >
          {t('logIn')}
        </MagneticButton>
        <button
          onClick={onSignup}
          className="focus-ring hidden rounded-full border-2 border-sky-500 bg-white px-4 py-2 text-sm text-sky-600 transition-all duration-200 hover:scale-[1.02] hover:border-sky-600 hover:bg-sky-50 sm:block"
        >
          {t('signUp')}
        </button>
        <MagneticButton
          type="button"
          onClick={onEnterPlatform}
          className="focus-ring nav-cta rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-300/50 active:scale-[0.98]"
        >
          {t('enterPlatform')}
        </MagneticButton>
      </nav>
    </motion.header>
  );
}
