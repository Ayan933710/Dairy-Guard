import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import RiskBadge from './RiskBadge.jsx';
import { openNearbyVetSearch } from '../../lib/vetLocator.js';
import { LoadingState, ErrorState } from '../shared/AsyncState.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { fetchRecommendations, fetchHerd } from '../../lib/herdApi.js';

export default function PredictionsPage() {
  const { t } = useLanguage();
  const { data: recommendations, loading: loadingRecs, error: recsError, refetch: refetchRecs } = useFetch(fetchRecommendations, []);
  const { data: herd, loading: loadingHerd, error: herdError } = useFetch(fetchHerd, []);

  if (loadingRecs || loadingHerd) return <LoadingState label={t('loadingRecommendations')} />;
  if (recsError || herdError) return <ErrorState message={recsError || herdError} onRetry={refetchRecs} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-milk">{t('predictionTitle')}</h2>
        <p className="mt-1 text-sm text-milk-dim">
          {t('predictionDescription')}
        </p>
      </div>

      <div className="space-y-4">
        {recommendations.map((r) => {
          const animal = herd.find((a) => a.id === r.animalId);
          if (!animal) return null;
          return (
            <div
              key={r.id}
              className="rounded-xl border border-milk/10 bg-night-card/60 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-milk">
                    {animal.name}{' '}
                    <span className="text-sm font-normal text-milk-dim">· {animal.displayTag}</span>
                  </p>
                  <p className="text-xs text-milk-dim">{r.profile}</p>
                </div>
                <RiskBadge risk={r.urgency} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-milk">{r.action}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Link
                  to={`/dashboard/species/${animal.species}/${animal.id}`}
                  className="focus-ring text-xs font-medium text-sky-600 transition-colors hover:text-sky-700"
                >
                  {t('viewRecord')}
                </Link>
                <button
                  type="button"
                  onClick={() => openNearbyVetSearch()}
                  className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 transition-colors hover:text-sky-700"
                >
                  <MapPin size={13} /> {t('findNearbyVet')}
                </button>
              </div>
            </div>
          );
        })}

        {recommendations.length === 0 && (
          <p className="rounded-xl border border-milk/10 bg-night-card/60 p-6 text-sm text-milk-dim">
            {t('noRecommendations')}
          </p>
        )}
      </div>
    </div>
  );
}
