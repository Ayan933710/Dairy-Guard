import { useState } from 'react';
import { motion } from 'framer-motion';
import MiniDeviceViewer from '../shared/MiniDeviceViewer.jsx';
import NeuralWeb from '../shared/NeuralWeb.jsx';
import { COLLAR_PARTS, CUP_PARTS, HUB_PARTS, WORKFLOW_STEPS } from '../../data/parts.js';
import { useLanguage } from '../../hooks/useLanguage.jsx';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function PartRow({ part }) {
  const { t } = useLanguage();
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
      className="feature-signal-row flex gap-4 rounded-lg border border-slate-200 bg-theme-bg-card p-4 shadow-sm"
    >
      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.45)]" />
      <div>
        <p className="font-display text-sm text-theme-text-dark">
          {t(part.name)} <span className="text-theme-text-muted">· {t(part.role)}</span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-theme-text-muted">{t(part.detail)}</p>
      </div>
    </motion.div>
  );
}

function DevicePanel({ title, subtitle, viewerType, parts }) {
  const { t } = useLanguage();
  const callouts = viewerType === 'collar'
    ? [[t('mpu6050'), t('motility')], [t('loraRadio'), t('loraRange')], [t('solarCell'), t('solarReserve')]]
    : viewerType === 'cup'
      ? [[t('ecPh'), t('chemistry')], [t('irProbe'), t('temperature')], [t('rfid'), t('animalId')]]
      : [[t('lora'), t('signalBridge')], [t('wifi4g'), t('cloudSync')], [t('devicesConnected'), t('devicesConnectedCount')]];
  const flow = viewerType === 'collar'
    ? [t('collarFlow1'), t('collarFlow2'), t('collarFlow3')]
    : viewerType === 'cup'
      ? [t('cupFlow1'), t('cupFlow2'), t('cupFlow3')]
      : [t('hubFlow1'), t('hubFlow2'), t('hubFlow3')];

  return (
    <div className="device-feature-panel">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fadeUp} className="device-feature-heading">
        <div>
          <h3 className="font-display text-2xl text-milk md:text-3xl">{title}</h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-milk-dim">{subtitle}</p>
          <div className="device-flow" aria-label={`${title} signal flow`}>
            {flow.map((step, stepIndex) => (
              <motion.div
                key={step}
                whileHover={{ x: 5, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                className="device-flow-step rounded-r-md transition-colors hover:bg-sky-500/10 active:bg-sky-500/20"
              >
                <span className="text-sky-600">0{stepIndex + 1}</span>
                <p>{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
      <div className="device-feature-stage">
        <div className="device-stage-halo" />
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fadeUp}>
          <div className="device-diagram">
            <MiniDeviceViewer type={viewerType} callouts={callouts} />
          </div>
        </motion.div>
      </div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: 0.08 }}
            className="device-parts-grid"
          >
            {parts.map((part) => (
              <PartRow key={part.id} part={part} />
            ))}
          </motion.div>
    </div>
  );
}

export default function FeaturesSection() {
  const { t } = useLanguage();
  const [activeDevice, setActiveDevice] = useState('collar');
  const devices = {
    collar: {
      title: t('smartCollar'),
      subtitle: t('smartCollarDescription'),
      parts: COLLAR_PARTS,
      
    },
    cup: {
      title: t('smartCup'),
      subtitle: t('smartCupDescription'),
      parts: CUP_PARTS,
      
    },
    hub: {
      title: t('nandiHub'),
      subtitle: t('nandiHubDescription'),
      parts: HUB_PARTS,
      
    },
  };
  const selected = devices[activeDevice];

  return (
    <section id="features" className="relative z-10 features-stage landing-features overflow-hidden bg-theme-bg-main px-6 py-24 md:px-12">
      <NeuralWeb className="neural-web neural-web-section" />
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeUp}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="font-display text-3xl text-theme-text-dark md:text-4xl">
          {t('threeSignals')}
        </h2>
        <p className="mt-3 text-sm text-theme-text-muted">
          {t('threeSignalsDescription')}
        </p>
      </motion.div>

      <div className="device-switcher mx-auto mt-8 max-w-5xl" role="tablist" aria-label={t('nandiDevices')}>
        {Object.entries(devices).map(([key, device], index) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeDevice === key}
            className={`device-tab ${activeDevice === key ? 'is-active' : ''}`}
            onClick={() => setActiveDevice(key)}
          >
            <span>{index + 1}</span>
            <strong>{device.title}</strong>
            <small>{key === 'collar' ? t('alwaysOnSensing') : key === 'cup' ? t('milkingIntelligence') : t('farmWideRelay')}</small>
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-5xl">
        <DevicePanel
          key={activeDevice}
          title={selected.title}
          subtitle={selected.subtitle}
          viewerType={activeDevice}
          parts={selected.parts}
        />
      </div>

      {/* Workflow timeline */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.1 }}
        className="workflow-timeline mx-auto mt-28 max-w-6xl"
      >
        <motion.h1
          variants={fadeUp}
          className="workflow-heading text-center font-display text-theme-text-dark"
        >
          {t('workflowTitle')}
        </motion.h1>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          {WORKFLOW_STEPS.map((s) => (
            <motion.div
              key={s.step}
              variants={fadeUp}
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="feature-step min-h-60 rounded-lg border border-slate-200 bg-theme-bg-card p-6 shadow-sm"
            >
              <span className="font-display text-xl text-sky-600">{s.step}</span>
              <p className="mt-2 font-display text-sm text-theme-text-dark">{t(s.title)}</p>
              <p className="mt-1 text-xs leading-relaxed text-theme-text-muted">{t(s.detail)}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
