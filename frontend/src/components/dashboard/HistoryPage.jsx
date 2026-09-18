import { LoadingState, ErrorState } from '../shared/AsyncState.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { fetchHistory } from '../../lib/herdApi.js';

export default function HistoryPage() {
  const { t } = useLanguage();
  const { data: events, loading, error, refetch } = useFetch(fetchHistory, []);

  if (loading) return <LoadingState label={t('loadingHistoryLog')} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-milk">{t('historyTitle')}</h2>
        <p className="mt-1 text-sm text-milk-dim">{t('historyDescription')}</p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-milk/10 bg-night-card/60 p-6 text-sm text-milk-dim">
          No events logged yet.
        </p>
      ) : (
        <ol className="relative space-y-6 border-l border-milk/10 pl-6">
          {events.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-theme-primary" />
              <p className="text-xs text-milk-dim">{h.date}</p>
              <p className="mt-1 text-sm text-milk">
                <span className="font-display">{h.animalName ?? h.animalDisplayTag}</span> — {h.event}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
