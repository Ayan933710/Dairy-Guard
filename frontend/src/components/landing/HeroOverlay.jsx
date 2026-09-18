import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Radio, ShieldCheck, Sparkles, Youtube } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

export default function HeroOverlay() {
  const { t } = useLanguage();
  return (
    <div className="pointer-events-none absolute inset-0 z-20 px-6 pb-16 pt-28 md:px-12 lg:px-16">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
        className="hero-copy max-w-2xl text-left text-theme-text-dark"
      >
        <div className="hero-eyebrow mb-6 inline-flex items-center gap-2 rounded-full border-sky-200 bg-sky-50/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-sky-700">
          <span className="status-dot" /> {t('fieldSignal')}
        </div>
        <h1 className="hero-title font-display text-5xl leading-[0.92] sm:text-7xl md:text-8xl">
          {t('knowSooner')}
          <span className="hero-title-accent"> {t('careBetter')}</span>
        </h1>
        <p className="mt-6 max-w-md text-sm leading-7 text-theme-text-muted md:text-base">
          {t('heroDescription')}
        </p>
        <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3">
          <a href="#features" className="hero-primary-button hover:scale-[1.03] active:scale-[0.98]">
            {t('exploreSystem')} <ArrowDownRight size={17} />
          </a>
          <a
            href="https://www.youtube.com/results?search_query=DairyGuard+AI+demo"
            target="_blank"
            rel="noreferrer"
            className="hero-demo-button"
          >
            <Youtube size={15} /> {t('watchDemo')}
          </a>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="hero-metric-card hero-card-one"
      >
        <div className="flex items-center justify-between gap-8"><span className="hero-card-label"><Radio size={13} /> {t('signalWatch')}</span><span className="hero-card-live">● {t('live')}</span></div>
        <div className="mt-3 flex items-end justify-between"><strong>94.8%</strong><span className="hero-card-positive"><ArrowUpRight size={14} /> 12.4%</span></div>
        <div className="hero-signal-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <span className="mt-2 block text-[10px] text-milk-dim/70">{t('behaviourConfidence')}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="hero-metric-card hero-card-two"
      >
        <div className="flex items-center gap-2 text-xs text-theme-text-dark"><ShieldCheck size={15} className="text-theme-risk-none" /> {t('earlyCareWindow')}</div>
        <p className="mt-2 font-display text-2xl text-theme-text-dark">7–14 days</p>
        <span className="text-[10px] text-theme-text-muted">{t('beforeSymptoms')}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="hero-annotation"
      >
        <Sparkles size={14} className="text-sky-600" />
        <span>{t('connectedView')}<br /><b>{t('wholeHerd')}</b></span>
        <ArrowUpRight size={15} />
      </motion.div>
    </div>
  );
}
