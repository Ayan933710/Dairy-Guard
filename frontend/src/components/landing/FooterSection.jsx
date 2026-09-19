import { motion } from 'framer-motion';
import { Mail, Github, MapPin } from 'lucide-react';
import { Download } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

export default function FooterSection() {
  const { t } = useLanguage();
  return (
    <footer className="landing-footer relative z-10 border-t border-slate-200 px-6 py-10 md:px-12">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-display text-lg text-theme-text-dark">
            NANDI
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-milk-dim">
            {t('footerAbout')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-xs tracking-wide text-sky-600">{t('disclaimer')}</p>
          <p className="mt-3 text-sm leading-relaxed text-milk-dim">
            {t('footerDisclaimer')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-xs tracking-wide text-sky-600">{t('contact')}</p>
          <ul className="mt-3 space-y-2 text-sm text-milk-dim">
            <li className="flex items-center gap-2">
              <Mail size={14} className="text-sky-600" /> hackcypher2025@gmail.com
            </li>
            <li className="flex items-center gap-2">
              <Github size={14} className="text-sky-600" /> github.com/hackcypher/nandi
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={14} className="text-sky-600" /> Heritage Institute of Technology, Kolkata
            </li>
          </ul>
        </motion.div>
      </div>

      <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-milk/10 pt-5">
        <p className="text-sm text-milk-dim">{t('apkUnavailable')}</p>
        <a href={import.meta.env.VITE_ANDROID_APK_URL || '/nandi.apk'} download className="dashboard-primary-button"><Download size={15} /> {t('downloadApk')}</a>
      </div>

      <p className="mx-auto mt-8 max-w-5xl border-t border-milk/10 pt-4 text-xs text-milk-dim/70">
        © 2026 Team HackCypher. Built for SIH — not affiliated with or
        endorsed by any commercial dairy brand named in this prototype's
        research.
      </p>
    </footer>
  );
}
