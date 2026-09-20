import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { ErrorState, LoadingState } from '../shared/AsyncState.jsx';

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState(null);
  const [vets, setVets] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [vetToRemove, setVetToRemove] = useState(null);
  const [removePhrase, setRemovePhrase] = useState('');

  async function loadRequests() {
    try {
      setError('');
      const [requestResponse, overview] = await Promise.all([api.get('/admin/vet-requests'), api.get('/admin/overview')]);
      setRequests(requestResponse.requests);
      setVets(overview.vets || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadRequests(); }, []);

  async function review(requestId, decision) {
    try {
      setBusy(requestId);
      setMessage('');
      await api.patch(`/admin/vet-requests/${requestId}/${decision}`, {});
      setMessage(`Vet request ${decision === 'approve' ? 'approved' : 'declined'}.`);
      await loadRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function removeVet() {
    if (!vetToRemove || removePhrase.trim().toUpperCase() !== 'REMOVE') return;
    try {
      setBusy(vetToRemove.id);
      await api.del(`/admin/users/${vetToRemove.id}`);
      setVets((current) => current.filter((vet) => vet.id !== vetToRemove.id));
      setVetToRemove(null);
      setRemovePhrase('');
      setMessage(`${vetToRemove.full_name}'s vet account was removed.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  if (error && !requests) return <ErrorState message={error} onRetry={loadRequests} />;
  if (!requests) return <LoadingState label="Loading vet requests..." />;

  const pending = requests.filter((request) => request.status === 'pending');
  const history = requests.filter((request) => request.status !== 'pending');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="dashboard-kicker">Administrator Console</p><h1 className="dashboard-page-title">Vet Requests</h1><p className="mt-1 text-sm text-theme-text-muted">Review applications, see request history, and manage registered veterinary officers.</p></div><button type="button" className="dashboard-secondary-button" onClick={loadRequests}><RefreshCw size={15} /> Refresh</button></header>
      {message && <p className="dashboard-form-success" role="status">{message}</p>}
      {error && <p className="dashboard-form-error" role="alert">{error}</p>}
      <section className="dashboard-panel overflow-x-auto"><div className="flex items-center justify-between gap-3"><div><h2 className="dashboard-section-title">Pending requests</h2><p className="mt-1 text-sm text-theme-text-muted">Approve or decline access requests from vets.</p></div><ShieldCheck size={20} className="text-theme-primary" /></div>{pending.length === 0 ? <p className="mt-4 text-sm text-theme-text-muted">No pending vet requests.</p> : <table className="mt-4 w-full min-w-[820px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Vet</th><th>Registration</th><th>State</th><th>District</th><th /></tr></thead><tbody>{pending.map((request) => <tr key={request.id} className="border-b border-slate-100"><td className="py-3"><strong>{request.full_name}</strong><span className="block text-xs text-theme-text-muted">{request.email || request.phone || 'No contact'}</span></td><td>{request.registration_number || 'Not provided'}</td><td>{request.vet_state || 'Not provided'}</td><td>{request.requested_district}</td><td className="text-right"><div className="flex justify-end gap-2"><button type="button" className="dashboard-primary-button" disabled={busy === request.id} onClick={() => review(request.id, 'approve')}><CheckCircle2 size={15} /> Accept</button><button type="button" className="dashboard-secondary-button" disabled={busy === request.id} onClick={() => review(request.id, 'reject')}><XCircle size={15} /> Decline</button></div></td></tr>)}</tbody></table>}</section>
      <section className="dashboard-panel overflow-x-auto"><h2 className="dashboard-section-title">Request history</h2><table className="mt-4 w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Vet</th><th>District</th><th>Status</th><th>Submitted</th><th>Reviewed</th></tr></thead><tbody>{history.length ? history.map((request) => <tr key={request.id} className="border-b border-slate-100"><td className="py-3">{request.full_name}<span className="block text-xs text-theme-text-muted">{request.registration_number || 'No registration'}</span></td><td>{request.requested_district}</td><td className={request.status === 'approved' ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{request.status}</td><td>{new Date(request.created_at).toLocaleDateString()}</td><td>{request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : '—'}</td></tr>) : <tr><td className="py-4 text-sm text-theme-text-muted" colSpan="5">No completed requests yet.</td></tr>}</tbody></table></section>
      <section className="dashboard-panel overflow-x-auto"><h2 className="dashboard-section-title">Registered vets</h2><table className="mt-4 w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Vet</th><th>Registration</th><th>District</th><th>Status</th><th /></tr></thead><tbody>{vets.map((vet) => <tr key={vet.id} className="border-b border-slate-100"><td className="py-3">{vet.full_name}<span className="block text-xs text-theme-text-muted">{vet.email || vet.phone || 'No contact'}</span></td><td>{vet.registration_number || 'Not provided'}</td><td>{vet.vet_district || 'Not assigned'}</td><td>{vet.vet_approval_status}</td><td className="text-right"><button type="button" className="dashboard-secondary-button text-red-700" onClick={() => { setVetToRemove(vet); setRemovePhrase(''); }}><Trash2 size={15} /> Remove</button></td></tr>)}</tbody></table></section>
      {vetToRemove && <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={() => setVetToRemove(null)}><section className="dashboard-modal max-w-lg" role="dialog" aria-modal="true" aria-labelledby="remove-vet-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="remove-vet-title" className="font-display text-2xl text-theme-text-dark">Remove registered vet</h2><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-theme-text-muted">Name</dt><dd className="font-medium">{vetToRemove.full_name}</dd></div><div><dt className="text-theme-text-muted">Registration</dt><dd className="font-medium">{vetToRemove.registration_number || 'Not provided'}</dd></div><div><dt className="text-theme-text-muted">District</dt><dd className="font-medium">{vetToRemove.vet_district || 'Not assigned'}</dd></div><div><dt className="text-theme-text-muted">Contact</dt><dd className="font-medium">{vetToRemove.email || vetToRemove.phone || 'Not provided'}</dd></div></dl><p className="mt-5 text-sm text-red-700">Type <strong>REMOVE</strong> to permanently remove this vet account.</p><input className="auth-input-wrap mt-2 w-full" value={removePhrase} onChange={(event) => setRemovePhrase(event.target.value)} placeholder="Type REMOVE" autoComplete="off" /><div className="mt-5 flex justify-end gap-3"><button type="button" className="dashboard-secondary-button" onClick={() => setVetToRemove(null)}>Cancel</button><button type="button" className="dashboard-primary-button bg-red-700 hover:bg-red-800" disabled={removePhrase.trim().toUpperCase() !== 'REMOVE'} onClick={removeVet}><Trash2 size={15} /> Remove vet</button></div></section></div>}
    </div>
  );
}
