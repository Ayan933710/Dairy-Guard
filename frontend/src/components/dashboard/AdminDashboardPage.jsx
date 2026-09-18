import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { ErrorState, LoadingState } from '../shared/AsyncState.jsx';

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState('');
  const [message, setMessage] = useState('');

  async function loadRequests() {
    try {
      setError('');
      const { requests: pending } = await api.get('/vet/district-requests');
      setRequests(pending);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function approve(requestId) {
    try {
      setApproving(requestId);
      setMessage('');
      await api.patch(`/vet/district-requests/${requestId}/approve`, {});
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setMessage('Vet district approved. The vet can refresh their dashboard now.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setApproving('');
    }
  }

  if (error && !requests) return <ErrorState message={error} onRetry={loadRequests} />;
  if (!requests) return <LoadingState label="Loading vet requests..." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="dashboard-kicker">Administrator Console</p><h1 className="dashboard-page-title">Vet district requests</h1><p className="mt-1 text-sm text-theme-text-muted">Review and approve veterinary officers before they access district farm health data.</p></div>
        <button type="button" className="dashboard-secondary-button" onClick={loadRequests}><RefreshCw size={15} /> Refresh</button>
      </header>
      {message && <p className="dashboard-form-success" role="status">{message}</p>}
      {error && <p className="dashboard-form-error" role="alert">{error}</p>}
      {requests.length === 0 ? (
        <section className="dashboard-panel"><p className="text-sm text-theme-text-muted">No pending vet district requests.</p></section>
      ) : (
        <section className="dashboard-panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Veterinary officer</th><th>Registration</th><th>State</th><th>Requested district</th><th>Submitted</th><th /></tr></thead>
            <tbody>{requests.map((request) => (
              <tr key={request.id} className="border-b border-slate-100">
                <td className="py-3"><strong>{request.full_name}</strong><span className="block text-xs text-theme-text-muted">{request.email || request.phone || 'No contact email'}</span></td>
                <td>{request.registration_number || 'Not provided'}</td>
                <td>{request.vet_state || 'Not provided'}</td>
                <td className="font-medium text-slate-900">{request.requested_district}</td>
                <td>{new Date(request.created_at).toLocaleDateString()}</td>
                <td className="text-right"><button type="button" className="dashboard-primary-button" disabled={approving === request.id} onClick={() => approve(request.id)}><CheckCircle2 size={15} /> {approving === request.id ? 'Approving...' : 'Approve'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
      <p className="flex items-center gap-2 text-xs text-theme-text-muted"><ShieldCheck size={14} /> Approval assigns the requested district to the vet account.</p>
    </div>
  );
}
