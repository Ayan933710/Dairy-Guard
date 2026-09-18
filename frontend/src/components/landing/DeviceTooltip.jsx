import { motion } from 'framer-motion';

export default function DeviceTooltip({ device, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`device-tooltip ${compact ? 'device-tooltip-compact' : ''}`}
    >
      <p className="font-display text-sm text-theme-text-dark">{device.name}</p>
      <p className="mt-0.5 text-[11px] text-sky-600">{device.tagline}</p>
      <ul className="mt-2 space-y-1">
        {device.specs.map((s) => (
          <li key={s.label} className="rounded-md px-1 py-0.5 text-[11px] leading-snug text-theme-text-muted transition-all duration-200 hover:scale-105 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">
            <span className="text-theme-text-dark">{s.label}:</span> {s.value}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] font-medium text-sky-700">{device.price}</p>
    </motion.div>
  );
}
