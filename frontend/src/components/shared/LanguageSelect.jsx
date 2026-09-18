import { Languages } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage.jsx';

export default function LanguageSelect() {
  const { language, setLanguage, languages, t } = useLanguage();

  return (
    <label className="language-select" title={t('language')}>
      <Languages size={15} aria-hidden="true" />
      <span className="sr-only">{t('language')}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('language')}>
        {Object.entries(languages).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </label>
  );
}
