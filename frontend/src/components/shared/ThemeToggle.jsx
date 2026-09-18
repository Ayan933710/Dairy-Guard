import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? t('switchToLight') : t('switchToDark')}
      title={isDark ? t('switchToLight') : t('switchToDark')}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? t('light') : t('dark')}</span>
    </button>
  );
}
