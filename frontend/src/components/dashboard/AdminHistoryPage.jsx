import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { ErrorState, LoadingState } from '../shared/AsyncState.jsx';

export default function AdminHistoryPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  async function loadEvents() {
    try {
      setError('');
      const { events: nextEvents } = await api.get('/admin/activity');
      setEvents(nextEvents);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadEvents(); }, []);

  if (error && !events) return <ErrorState message={error} onRetry={loadEvents} />;
  if (!events) return <LoadingState label="Loading administrator activity..." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="dashboard-kicker">Audit trail</p><h1 className="dashboard-page-title">Website activity</h1><p className="mt-1 text-sm text-theme-text-muted">Accounts, approvals, sign-ins, removals, and other important actions.</p></div>
        <button type="button" className="dashboard-secondary-button" onClick={loadEvents}><RefreshCw size={15} /> Refresh</button>
      </header>
      {events.length === 0 ? <section className="dashboard-panel text-sm text-theme-text-muted">No activity has been recorded yet.</section> : <section className="dashboard-panel overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Time</th><th>Activity</th><th>Person</th><th>Details</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b border-slate-100"><td className="py-3 whitespace-nowrap">{new Date(event.created_at).toLocaleString()}</td><td><strong>{event.action.replaceAll('_', ' ')}</strong><span className="block text-xs text-theme-text-muted">{event.entity_type}</span></td><td>{event.actor_name || 'System'}<span className="block text-xs text-theme-text-muted">{event.actor_role || ''}</span></td><td className="max-w-sm text-xs text-theme-text-muted">{Object.entries(event.details || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || '—'}</td></tr>)}</tbody></table></section>}
    </div>
  );
}
