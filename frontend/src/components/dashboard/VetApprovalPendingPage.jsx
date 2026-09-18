import { Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext.jsx';

export default function VetApprovalPendingPage() {
  const { user } = useAuth();

  return (
    <section className="dashboard-panel max-w-2xl">
      <p className="dashboard-kicker">Veterinary Officer Console</p>
      <h1 className="dashboard-page-title">Administrator approval pending</h1>
      <p className="mt-2 text-sm text-theme-text-muted">
        Your signup request was sent to the administrator. Your district dashboards and veterinary tools will unlock after approval.
      </p>
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-medium"><Clock3 size={16} /> Waiting for district approval</p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div><dt className="text-amber-700">Veterinary officer</dt><dd className="font-medium">{user?.full_name}</dd></div>
          <div><dt className="text-amber-700">Registration number</dt><dd className="font-medium">{user?.registration_number || 'Not provided'}</dd></div>
          <div><dt className="text-amber-700">Requested district</dt><dd className="font-medium">{user?.vet_district || 'Submitted during signup'}</dd></div>
          <div><dt className="text-amber-700">Status</dt><dd className="font-medium">Pending administrator review</dd></div>
        </dl>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="dashboard-primary-button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Check approval status</button>
        <span className="dashboard-secondary-button"><ShieldCheck size={15} /> Access unlocks after approval</span>
      </div>
    </section>
  );
}
