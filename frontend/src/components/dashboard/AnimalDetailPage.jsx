import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { openNearbyVetSearch } from '../../lib/vetLocator.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RefreshCw, MapPin, Trash2, X } from 'lucide-react';
import { riskColor } from '../../data/herd.js';
import RiskBadge from './RiskBadge.jsx';
import RotatingAnimal from './RotatingAnimal.jsx';
import AnimatedChartTooltip, { AnimatedActiveDot } from '../shared/AnimatedChartTooltip.jsx';
import { LoadingState, ErrorState } from '../shared/AsyncState.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { fetchAnimalDetail, fetchRecommendations, removeAnimal } from '../../lib/herdApi.js';
import { api } from '../../lib/apiClient.js';
import { connectSocket } from '../../lib/socket.js';

export default function AnimalDetailPage() {
  const { t } = useLanguage();
  const { species, animalId } = useParams();
  const navigate = useNavigate(); 
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removePhrase, setRemovePhrase] = useState('');
  const [livePrediction, setLivePrediction] = useState(null);

  const { data: detail, loading, error, refetch } = useFetch(() => fetchAnimalDetail(animalId), [animalId]);
  const { data: recommendations } = useFetch(fetchRecommendations, []);

  useEffect(() => {
    const socket = connectSocket();
    const refreshAnimal = (updatedAnimal) => {
      if (updatedAnimal?.id === animalId) refetch();
    };
    socket.on('animal:updated', refreshAnimal);
    return () => socket.off('animal:updated', refreshAnimal);
  }, [animalId, refetch]);

  if (loading) return <LoadingState label={t('loadingAnimalProfile')} />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} onRetry={refetch} />
        <Link to={`/dashboard/species/${species}`} className="text-sky-600 transition-colors hover:text-sky-700">
          ← Back to {species} list
        </Link>
      </div>
    );
  }

  const { animal, trend } = detail;
  const recommendation = recommendations?.find((r) => r.animalId === animal.id);

  // Helper to map category strings to herd.js badge styles
  const getRiskKey = (cat) => {
    if (!cat) return 'none';
    const lower = cat.toLowerCase();
    if (lower.includes('high')) return 'high';
    if (lower.includes('mod')) return 'moderate';
    if (lower.includes('low')) return 'low';
    return 'none';
  };

  // Derive display values from live FastAPI prediction when available
  const activeAnimal = livePrediction
    ? {
        ...animal,
        risk: getRiskKey(livePrediction.risk_category || (livePrediction.overall_risk_score >= 70 ? 'high' : livePrediction.overall_risk_score >= 25 ? 'moderate' : 'low')),
        riskScore: livePrediction.overall_risk_score ?? livePrediction.risk_score_pct,
        rumination: livePrediction.rumination_delta ?? animal.rumination,
        thi: livePrediction.shed_thi ?? animal.thi,
        cowTemp: livePrediction.cow_body_temp ?? livePrediction.cow_temperature ?? animal.cowTemperature ?? animal.temperature ?? animal.bodyTemp ?? animal.body_temperature ?? null,
      }
    : {
        ...animal,
        cowTemp: animal.cowTemperature ?? animal.temperature ?? animal.bodyTemp ?? animal.body_temperature ?? null,
      };

  const activeQuarters = livePrediction?.quarter_results || livePrediction?.quarters
    ? Object.entries(livePrediction.quarter_results || livePrediction.quarters).map(([qKey, qData]) => {
        // Handle both flat structures and nested 'metrics' structure
        const source = qData.metrics || qData;
        return {
          quarter: qKey,
          ec: source.ec ?? source.ec_value ?? source.ecValue ?? null,
          ph: source.ph ?? source.ph_value ?? source.phValue ?? null,
          color: source.color ?? source.colour ?? source.color_code ?? '—',
          viscosity: source.viscosity ?? source.viscosity_value ?? source.viscosityValue ?? null,
          is_infected: qData.ai_prediction === 'subclinical' || qData.risk_pct >= 50,
        }
      })
    : detail.quarters.map((q) => ({
        ...q,
        ec: q.ec ?? q.ecValue ?? null,
        ph: q.ph ?? q.phValue ?? null,
        color: q.color ?? q.colour ?? q.colorCode ?? '—',
        viscosity: q.viscosity ?? q.viscosityValue ?? null,
        is_infected: false,
      }));

  const activeTrend = livePrediction?.['30_day_trend']
    ? livePrediction['30_day_trend'].map((t) => ({
        day: t.date || t.day,
        risk: t.risk,
      }))
    : trend;

  const getDynamicRecommendation = (score) => {
    if (score >= 75) return "High Risk: Isolate cow immediately, hold milk, and contact a veterinarian.";
    if (score >= 50) return "Moderate Risk: Divert milk and perform a California Mastitis Test (CMT).";
    if (score >= 20) return "Elevated Risk: Monitor quarters closely during the next milking session.";
    return "Low Risk: All metrics normal. Continue standard milking routine.";
  };

  const activeRecommendation = livePrediction
    ? {
        profile: livePrediction.pathogen_profile || 'AI Quarter-Level Analysis',
        action: getDynamicRecommendation(activeAnimal.riskScore),
      }
    : recommendation;

  async function handleRunPrediction() {
    setRunError('');
    try {
      setIsRunning(true);
      const targetCowId = animal?.displayTag || animal?.display_tag || animal?.id || animalId || 'C-118';

      let data = null;

      // 1. Try calling through the backend API proxy (works on mobile APK, LAN, and desktop)
      try {
        data = await api.post(`/cow/${encodeURIComponent(targetCowId)}/predict`, {});
      } catch (proxyErr) {
        // 2. Fallback to direct FastAPI call with dynamic host resolution
        const aiBaseUrl = (
          import.meta.env.VITE_AI_URL?.trim() ||
          (import.meta.env.VITE_API_URL
            ? new URL(import.meta.env.VITE_API_URL).origin.replace(/:\d+$/, ':8000')
            : '') ||
          'http://172.16.60.135:8000'
        ).replace(/\/+$/, '');

        let res = await fetch(`${aiBaseUrl}/api/cow/${encodeURIComponent(targetCowId)}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok && res.status === 404 && targetCowId !== 'C-118') {
          res = await fetch(`${aiBaseUrl}/api/cow/C-118/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (!res.ok) {
          throw new Error(proxyErr.message || `Server error: ${res.status}`);
        }

        data = await res.json();
      }

      if (data) {
        setLivePrediction(data);
      }
    } catch (err) {
      setRunError(err.message || 'Could not run a new prediction.');
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRemove() {
    if (removePhrase.trim().toUpperCase() !== 'REMOVE') return;
    try {
      setRemoveError('');
      await removeAnimal(animal.id);
      navigate(`/dashboard/species/${species}`);
    } catch (err) {
      setRemoveError(err.message || 'Could not remove this animal.');
    }
  }

  return (
    <div className="space-y-8">
      <Link
        to={`/dashboard/species/${species}`}
        className="focus-ring text-xs text-milk-dim hover:text-milk"
      >
        ← Back to {species}s
      </Link>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="animal-detail-model-box rounded-xl border border-milk/10 bg-night-card/40">
          <RotatingAnimal species={species} className="h-full w-full" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-3xl text-milk">{activeAnimal.name}</h2>
              <p className="text-sm text-milk-dim">
                {activeAnimal.displayTag} · RFID: {activeAnimal.rfidTag} · {activeAnimal.breed} · Lactation #{activeAnimal.lactation}
              </p>
            </div>
            <RiskBadge risk={activeAnimal.risk} size="lg" />
          </div>

          {/* TOP SECTION: Overall Cow Health Metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-milk/10 bg-night-card/60 p-3 text-center flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wide text-milk-dim">{t('riskScore')}</p>
              <p
                className="mt-1 font-display text-2xl font-bold"
                style={{ color: riskColor[activeAnimal.risk] || '#EF4444' }}
              >
                {activeAnimal.riskScore != null ? `${activeAnimal.riskScore}%` : '0%'}
              </p>
            </div>
            <div className="rounded-lg border border-milk/10 bg-night-card/60 p-3 text-center flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wide text-milk-dim">Rumination Δ</p>
              <p className="mt-1 font-display text-2xl text-milk">
                {activeAnimal.rumination != null ? `${activeAnimal.rumination}%` : '0%'}
              </p>
            </div>
            <div className="rounded-lg border border-milk/10 bg-night-card/60 p-3 text-center flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wide text-milk-dim">Cow temp</p>
              <p className="mt-1 font-display text-2xl text-milk">
                {activeAnimal.cowTemp != null ? `${Number(activeAnimal.cowTemp).toFixed(1)}°C` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-milk/10 bg-night-card/60 p-3 text-center flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wide text-milk-dim">{t('shedThiShort')}</p>
              <p className="mt-1 font-display text-2xl text-milk">
                {activeAnimal.thi != null ? Number(activeAnimal.thi).toFixed(1) : '0'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunPrediction}
              disabled={isRunning}
              className="dashboard-secondary-button inline-flex items-center gap-2"
            >
              <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
              {isRunning ? t('running') : t('runPredictionNow')}
            </button>
            {runError && <span className="text-xs text-red-400">{runError}</span>}
            <button type="button" onClick={() => { setRemovePhrase(''); setShowRemoveDialog(true); }} className="dashboard-secondary-button inline-flex items-center gap-2 text-red-700">
              <Trash2 size={14} /> {t('removeAnimal')}
            </button>
          </div>
          {removeError && <p className="mt-2 text-xs text-red-600">{removeError}</p>}

          {/* BOTTOM SECTION: Quarter-Level Raw Telemetry */}
          <div className="mt-6">
            <p className="mb-3 text-xs uppercase tracking-wide text-milk-dim">
              {t('quarterLevelReadings')}
            </p>
            {activeQuarters.length === 0 ? (
              <div className="rounded-lg border border-milk/10 bg-night-card/60 p-6">
                <p className="text-sm text-milk-dim">
                  No quarter-level readings yet — waiting on the first Smart Cup telemetry for this animal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {activeQuarters.map((q) => (
                  <div key={q.quarter} className="rounded-lg border border-milk/10 bg-night-card/60 p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-display text-sm text-milk">{q.quarter}</span>
                      {q.is_infected && (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                          Infected
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-milk-dim mb-1">EC (mS/cm)</span>
                        <span className="text-milk font-medium">{q.ec != null ? Number(q.ec).toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-milk-dim mb-1">pH</span>
                        <span className="text-milk font-medium">{q.ph != null ? Number(q.ph).toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-milk-dim mb-1">Viscosity</span>
                        <span className="text-milk font-medium">{q.viscosity != null ? Number(q.viscosity).toFixed(1) : '—'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-milk-dim mb-1">Color</span>
                        <span className="text-milk font-medium">{q.color ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeRecommendation && (
            <div className="recommendation-box mt-6 rounded-lg p-4">
              <p className="recommendation-box-label text-xs font-medium">
                {t('recommendedAction')} · {activeRecommendation.profile}
              </p>
              <p className="recommendation-box-action mt-1 text-sm">{activeRecommendation.action}</p>
              <button
                type="button"
                onClick={() => openNearbyVetSearch()}
                className="dashboard-secondary-button mt-3 inline-flex items-center gap-2 text-xs"
              >
                <MapPin size={13} /> {t('findNearbyVet')}
              </button>
            </div>
          )}
        </div>
      </div>
      {showRemoveDialog && (
        <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={() => setShowRemoveDialog(false)}>
          <section className="dashboard-modal max-w-lg" role="dialog" aria-modal="true" aria-labelledby="remove-animal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="dashboard-kicker text-red-700">Permanent action</p><h2 id="remove-animal-title" className="font-display text-2xl text-theme-text-dark">Remove animal</h2></div>
              <button type="button" className="icon-button" onClick={() => setShowRemoveDialog(false)} aria-label="Close remove animal dialog"><X size={18} /></button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-theme-text-muted">Name</dt><dd className="font-medium">{activeAnimal.name}</dd></div>
              <div><dt className="text-theme-text-muted">Animal</dt><dd className="font-medium capitalize">{species}</dd></div>
              <div><dt className="text-theme-text-muted">Animal ID</dt><dd className="font-medium">{activeAnimal.displayTag}</dd></div>
              <div><dt className="text-theme-text-muted">RFID</dt><dd className="font-medium">{activeAnimal.rfidTag}</dd></div>
              <div><dt className="text-theme-text-muted">Breed</dt><dd className="font-medium">{activeAnimal.breed}</dd></div>
              <div><dt className="text-theme-text-muted">Age</dt><dd className="font-medium">{activeAnimal.age} years</dd></div>
            </dl>
            <p className="mt-5 text-sm text-red-700">Type <strong>REMOVE</strong> to confirm this animal will be removed from your herd.</p>
            <input className="auth-input-wrap mt-2 w-full" value={removePhrase} onChange={(event) => setRemovePhrase(event.target.value)} placeholder="Type REMOVE" autoComplete="off" />
            <div className="mt-5 flex justify-end gap-3"><button type="button" className="dashboard-secondary-button" onClick={() => setShowRemoveDialog(false)}>Cancel</button><button type="button" className="dashboard-primary-button bg-red-700 hover:bg-red-800" disabled={removePhrase.trim().toUpperCase() !== 'REMOVE'} onClick={handleRemove}><Trash2 size={15} /> Remove animal</button></div>
          </section>
        </div>
      )}

      <div className="rounded-xl border border-milk/10 bg-night-card/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg text-milk">{t('riskTrend30')}</p>
          <span className="text-xs text-milk-dim">{t('riskAxis')}</span>
        </div>
        <div className="h-64">
          {activeTrend.length === 0 ? (
            <p className="grid h-full place-items-center text-xs text-milk-dim">{t('noRiskHistory')}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeTrend} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} opacity={0.1} />
                <XAxis
                  dataKey="day"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  angle={-30}
                  textAnchor="end"
                  height={36}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  width={36}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={<AnimatedChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="risk"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  dot={false}
                  activeDot={<AnimatedActiveDot />}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}