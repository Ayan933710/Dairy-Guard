/** Redirects to /login when there is no authenticated user; shows nothing while the initial /auth/me check is in flight. */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { status, user } = useAuth();
  const { t } = useLanguage();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-theme-bg-main text-sm text-theme-text-muted">
        {t('checkingSession')}
      </div>
    );
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
