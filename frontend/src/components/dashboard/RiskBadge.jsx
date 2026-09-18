import { riskColor } from '../../data/herd.js';

export default function RiskBadge({ risk, size = 'sm' }) {
  const color = riskColor[risk] ?? '#8AB894';
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${pad} font-medium`}
      style={{ borderColor: `${color}55`, color, backgroundColor: `${color}1A` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {risk}
    </span>
  );
}
