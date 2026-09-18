import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { motion } from 'framer-motion';
import { RISK_LEVELS, riskColor } from '../../data/herd.js';
import AnimatedChartTooltip, { AnimatedActiveDot } from '../shared/AnimatedChartTooltip.jsx';
import InteractiveCard from '../shared/InteractiveCard.jsx';
import { LoadingState, ErrorState } from '../shared/AsyncState.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { fetchAnalyticsSummary } from '../../lib/herdApi.js';

const CARD = 'rounded-xl border border-slate-200 bg-theme-bg-card p-5 shadow-sm';
const chartGroupVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } },
};

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { data: summary, loading, error, refetch } = useFetch(fetchAnalyticsSummary, []);

  if (loading) return <LoadingState label={t('loadingAnalytics')} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  // riskBreakdown from the backend only includes levels that actually occur -
  // fill in the rest at 0 so the pie chart always shows all four segments.
  const countByLevel = Object.fromEntries(summary.riskBreakdown.map((r) => [r.risk_level, r.count]));
  const dist = RISK_LEVELS.map((level) => ({ level, count: countByLevel[level] || 0 }));

  const speciesAvg = summary.speciesBreakdown.map((s) => ({
    species: s.species,
    avgRisk: Number(s.avg_risk_score) || 0,
  }));

  const herdTrend = summary.herdAvgTrend.map((point) => ({
    day: new Date(point.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    avgRisk: Number(point.avg_risk_score),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl text-theme-text-dark">{t('analyticsTitle')}</h2>
        <p className="mt-1 text-sm text-theme-text-muted">{t('herdTrends')}</p>
      </div>

      <motion.div
        variants={chartGroupVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 lg:grid-cols-2"
      >
        <InteractiveCard className={`${CARD} min-w-0`}>
          <p className="mb-4 font-display text-lg text-theme-text-dark">{t('riskDistribution')}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dist}
                  dataKey="count"
                  nameKey="level"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {dist.map((d) => (
                    <Cell key={d.level} fill={riskColor[d.level]} stroke="none" />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#64748B' }}
                  formatter={(v) => <span style={{ color: '#64748B' }}>{v}</span>}
                />
                <Tooltip
                  content={<AnimatedChartTooltip />}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </InteractiveCard>

        <InteractiveCard className={`${CARD} min-w-0`}>
          <p className="mb-4 font-display text-lg text-theme-text-dark">{t('averageRisk')}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={speciesAvg}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="species" stroke="#64748B" fontSize={12} tickLine={false} label={{ value: t('speciesAxis'), position: 'insideBottom', offset: -4, fill: '#64748B', fontSize: 11 }} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} width={30} label={{ value: t('riskAxis'), angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }} />
                <Tooltip
                  content={<AnimatedChartTooltip />}
                />
                <Bar dataKey="avgRisk" radius={[6, 6, 0, 0]} fill="#0EA5E9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </InteractiveCard>

        <InteractiveCard className={`${CARD} min-w-0 lg:col-span-2`}>
          <p className="mb-4 font-display text-lg text-theme-text-dark">{t('herdAvgTrend30')}</p>
          <div className="h-56">
            {herdTrend.length === 0 ? (
              <p className="grid h-full place-items-center text-xs text-theme-text-muted">
                {t('noHerdTrend')}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={herdTrend} margin={{ bottom: 18 }}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                    angle={-35}
                    textAnchor="end"
                    height={40}
                    label={{ value: t('dateAxis'), position: 'insideBottom', offset: -8, fill: '#64748B', fontSize: 11 }}
                  />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} width={30} domain={[0, 100]} label={{ value: t('riskAxis'), angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }} />
                  <Tooltip
                    content={<AnimatedChartTooltip />}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgRisk"
                    stroke="#0EA5E9"
                    strokeWidth={2}
                    dot={false}
                    activeDot={<AnimatedActiveDot />}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </InteractiveCard>
      </motion.div>
    </div>
  );
}
