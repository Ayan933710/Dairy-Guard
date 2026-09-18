import { motion } from 'framer-motion';

export default function AnimatedChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className="rounded-lg border border-sky-100 bg-white/95 px-3 py-2 text-xs text-theme-text-dark shadow-lg shadow-sky-500/10 backdrop-blur-md"
    >
      {label && <p className="mb-1 font-medium text-theme-text-muted">{label}</p>}
      {payload.map((item) => (
        <p key={item.dataKey ?? item.name}>
          <span className="text-sky-600">{item.name ?? item.dataKey}:</span>{' '}
          {item.value}
        </p>
      ))}
    </motion.div>
  );
}

export function AnimatedActiveDot({ cx, cy, fill = '#0EA5E9', stroke = '#FFFFFF' }) {
  return (
    <motion.circle
      initial={{ r: 3, opacity: 0.6 }}
      animate={{ r: 6, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      cx={cx}
      cy={cy}
      fill={fill}
      stroke={stroke}
      strokeWidth={2}
    />
  );
}
