/** Consistent loading / error placeholders for pages that fetch from the backend. */
import { Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

export function LoadingState({ label }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-milk/10 bg-night-card/60 p-6 text-sm text-milk-dim">
      <Loader2 size={16} className="animate-spin" />
      {label || t('loadingGeneric')}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>{message || t('somethingWentWrong')}</span>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="dashboard-secondary-button">
          {t('tryAgain')}
        </button>
      )}
    </div>
  );
}
