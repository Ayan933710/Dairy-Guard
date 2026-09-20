import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import HeroSection from './components/landing/HeroSection.jsx';
import FooterSection from './components/landing/FooterSection.jsx';
import AmbientBackground from './components/shared/AmbientBackground.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import { LanguageProvider } from './hooks/useLanguage.jsx';
import { useAuth } from './lib/AuthContext.jsx';

const FeaturesSection = lazy(() => import('./components/landing/FeaturesSection.jsx'));
const AuthPage = lazy(() => import('./components/auth/AuthPage.jsx'));
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout.jsx'));
const HerdOverviewPage = lazy(() => import('./components/dashboard/HerdOverviewPage.jsx'));
const SpeciesListPage = lazy(() => import('./components/dashboard/SpeciesListPage.jsx'));
const AnimalDetailPage = lazy(() => import('./components/dashboard/AnimalDetailPage.jsx'));
const AnalyticsPage = lazy(() => import('./components/dashboard/AnalyticsPage.jsx'));
const PredictionsPage = lazy(() => import('./components/dashboard/PredictionsPage.jsx'));
const HistoryPage = lazy(() => import('./components/dashboard/HistoryPage.jsx'));
const VetDashboardPage = lazy(() => import('./components/dashboard/VetDashboardPage.jsx'));
const WeeklyInputPage = lazy(() => import('./components/dashboard/WeeklyInputPage.jsx'));
const AdminDashboardPage = lazy(() => import('./components/dashboard/AdminDashboardPage.jsx'));
const MainAdminDashboardPage = lazy(() => import('./components/dashboard/MainAdminDashboardPage.jsx'));
const AdminHistoryPage = lazy(() => import('./components/dashboard/AdminHistoryPage.jsx'));
const VetApprovalPendingPage = lazy(() => import('./components/dashboard/VetApprovalPendingPage.jsx'));

function RouteLoading() {
  return <div className="route-loading" role="status" aria-label="Loading page"><span /></div>;
}

function FeatureLoading() {
  return <section className="feature-loading" aria-label="Loading features"><span /><span /><span /></section>;
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="landing-page relative isolate min-h-screen text-theme-text-dark">
      <AmbientBackground variant="landing" />
      <HeroSection
        onLogin={() => navigate('/login')}
        onSignup={() => navigate('/signup')}
        onEnterPlatform={() => navigate('/dashboard')}
      />
      <Suspense fallback={<FeatureLoading />}>
        <FeaturesSection />
      </Suspense>
      <FooterSection />
    </main>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <LanguageProvider>
      <ThemeProvider>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <Suspense fallback={<RouteLoading />}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<RoleDashboard />} />
                <Route path="species/:species" element={<SpeciesListPage />} />
                <Route path="species/:species/:animalId" element={<AnimalDetailPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="predictions" element={<PredictionsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="admin-history" element={<ProtectedRoute requiredRole="administrator"><AdminHistoryPage /></ProtectedRoute>} />
                <Route path="weekly-input" element={<WeeklyInputPage />} />
                <Route path="vet-requests" element={<ProtectedRoute requiredRole="administrator"><AdminDashboardPage /></ProtectedRoute>} />
                <Route path="accounts" element={<ProtectedRoute requiredRole="administrator"><MainAdminDashboardPage includeVetRequests={false} /></ProtectedRoute>} />
                <Route path="animals" element={<ProtectedRoute requiredRole="administrator"><MainAdminDashboardPage showOnlyAnimals /></ProtectedRoute>} />
                <Route path="regional-analysis" element={<ProtectedRoute requiredRole="administrator"><MainAdminDashboardPage showRegionalAnalysis /></ProtectedRoute>} />
                <Route path="admin" element={<ProtectedRoute requiredRole="administrator"><MainAdminDashboardPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </Suspense>
        </motion.div>
      </ThemeProvider>
    </LanguageProvider>
  );
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'vet' && user.vet_approval_status !== 'approved') return <VetApprovalPendingPage />;
  if (user?.role === 'vet') return <VetDashboardPage />;
  if (user?.role === 'administrator') return <MainAdminDashboardPage includeVetRequests={false} />;
  return <HerdOverviewPage />;
}
