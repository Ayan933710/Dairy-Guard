import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, RefreshCw, ShieldCheck, Trash2, UserCheck, UserX, XCircle } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { ErrorState, LoadingState } from '../shared/AsyncState.jsx';

const STAT_LABELS = [
  ['farms', 'Total farms'],
  ['animals', 'Total animals'],
  ['users', 'Registered accounts'],
  ['highRiskAnimals', 'High-risk animals'],
];

export default function MainAdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [accountForm, setAccountForm] = useState({ role: 'farmer', full_name: '', email: '', password: '', phone: '', farm_name: '', farm_state: '', farm_district: '', vet_state: '', vet_district: '', registration_number: '' });
  const [animalForm, setAnimalForm] = useState({ owner_id: '', display_tag: '', rfid_tag: '', name: '', species: 'cow', breed: '', age: 0, lactation_number: 0 });

  async function loadOverview() {
    try {
      setError('');
      const [nextOverview, nextAnimals] = await Promise.all([api.get('/admin/overview'), api.get('/admin/animals')]);
      setOverview(nextOverview);
      setAnimals(nextAnimals.animals);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadOverview(); }, []);

  async function reviewRequest(requestId, decision) {
    try {
      setBusy(requestId);
      setMessage('');
      await api.patch(`/admin/vet-requests/${requestId}/${decision}`, {});
      setOverview((current) => ({ ...current, requests: current.requests.filter((request) => request.id !== requestId) }));
      setMessage(`Vet request ${decision === 'approve' ? 'approved' : 'declined'}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function toggleUser(user) {
    try {
      setBusy(user.id);
      await api.patch(`/admin/users/${user.id}/status`, { is_active: !user.is_active });
      setOverview((current) => ({ ...current, users: current.users.map((item) => item.id === user.id ? { ...item, is_active: !item.is_active } : item) }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    try {
      setBusy('create');
      setCreateError('');
      await api.post('/admin/users', accountForm);
      setAccountForm({ role: 'farmer', full_name: '', email: '', password: '', phone: '', farm_name: '', farm_state: '', farm_district: '', vet_state: '', vet_district: '', registration_number: '' });
      setShowCreate(false);
      setMessage('Account created successfully.');
      await loadOverview();
    } catch (requestError) {
      setCreateError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function removeUser(user) {
    if (!window.confirm(`Remove ${user.full_name}'s account and associated records?`)) return;
    try {
      setBusy(user.id);
      await api.del(`/admin/users/${user.id}`);
      setOverview((current) => ({ ...current, users: current.users.filter((item) => item.id !== user.id), stats: { ...current.stats, users: Math.max(0, current.stats.users - 1), farms: ['farmer', 'cooperative_admin'].includes(user.role) ? Math.max(0, current.stats.farms - 1) : current.stats.farms } }));
      setMessage(`${user.full_name}'s account was removed.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function removeAnimal(animal) {
    try {
      setBusy(animal.id);
      await api.del(`/admin/animals/${animal.id}`);
      setAnimals((current) => current.filter((item) => item.id !== animal.id));
      setMessage(`${animal.name} was removed from the registry.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function createAnimal(event) {
    event.preventDefault();
    try {
      setBusy('animal-create');
      await api.post('/admin/animals', animalForm);
      setAnimalForm({ owner_id: '', display_tag: '', rfid_tag: '', name: '', species: 'cow', breed: '', age: 0, lactation_number: 0 });
      setMessage('Animal added to the registry.');
      await loadOverview();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  if (error && !overview) return <ErrorState message={error} onRetry={loadOverview} />;
  if (!overview) return <LoadingState label="Loading administrator console..." />;

  return (
    <div className="admin-console space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="dashboard-kicker">Main Administrator</p><h1 className="dashboard-page-title">DairyGuard control center</h1><p className="mt-1 text-sm text-theme-text-muted">Full visibility across farms, animals, accounts, and veterinary approvals.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" className="dashboard-primary-button" onClick={() => setShowCreate((current) => !current)}><Plus size={15} /> Add account or farm</button><button type="button" className="dashboard-secondary-button" onClick={loadOverview}><RefreshCw size={15} /> Refresh</button></div>
      </header>
      {message && <p className="dashboard-form-success" role="status">{message}</p>}
      {error && <p className="dashboard-form-error" role="alert">{error}</p>}
      {showCreate && <section className="dashboard-panel"><h2 className="dashboard-section-title">Create account or farm</h2><p className="mt-1 text-sm text-theme-text-muted">Creating a vet account sends it to the approval queue automatically.</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createAccount}><select className="auth-input-wrap" value={accountForm.role} onChange={(event) => setAccountForm({ ...accountForm, role: event.target.value })}><option value="farmer">Farmer / Farm</option><option value="vet">Vet</option><option value="cooperative_admin">Co-op Admin</option></select><input className="auth-input-wrap" placeholder="Full name" required value={accountForm.full_name} onChange={(event) => setAccountForm({ ...accountForm, full_name: event.target.value })} /><input className="auth-input-wrap" type="email" placeholder="Email" required value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} /><input className="auth-input-wrap" type="password" minLength="8" placeholder="Temporary password" required value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} /><input className="auth-input-wrap" placeholder="Phone" value={accountForm.phone} onChange={(event) => setAccountForm({ ...accountForm, phone: event.target.value })} />{accountForm.role !== 'vet' && <><input className="auth-input-wrap" placeholder="Farm name" value={accountForm.farm_name} onChange={(event) => setAccountForm({ ...accountForm, farm_name: event.target.value })} /><input className="auth-input-wrap" placeholder="Farm state" value={accountForm.farm_state} onChange={(event) => setAccountForm({ ...accountForm, farm_state: event.target.value })} /><input className="auth-input-wrap" placeholder="Farm district" value={accountForm.farm_district} onChange={(event) => setAccountForm({ ...accountForm, farm_district: event.target.value })} /></>}{accountForm.role === 'vet' && <><input className="auth-input-wrap" placeholder="Vet state" required value={accountForm.vet_state} onChange={(event) => setAccountForm({ ...accountForm, vet_state: event.target.value })} /><input className="auth-input-wrap" placeholder="Vet district" required value={accountForm.vet_district} onChange={(event) => setAccountForm({ ...accountForm, vet_district: event.target.value })} /><input className="auth-input-wrap" placeholder="Registration number" required value={accountForm.registration_number} onChange={(event) => setAccountForm({ ...accountForm, registration_number: event.target.value })} /></>}<div className="sm:col-span-2 flex flex-wrap gap-2"><button type="submit" className="dashboard-primary-button" disabled={busy === 'create'}><UserCheck size={15} /> Create</button><button type="button" className="dashboard-secondary-button" onClick={() => setShowCreate(false)}>Cancel</button></div>{createError && <p className="dashboard-form-error sm:col-span-2" role="alert">{createError}</p>}</form></section>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_LABELS.map(([key, label]) => <section className="dashboard-panel" key={key}><p className="text-xs text-theme-text-muted">{label}</p><p className="mt-2 font-display text-3xl text-theme-text-dark">{overview.stats[key]}</p></section>)}
      </div>

      <section className="dashboard-panel overflow-x-auto">
        <div className="flex items-center justify-between gap-3"><div><h2 className="dashboard-section-title">Vet approval requests</h2><p className="mt-1 text-sm text-theme-text-muted">Only approved vets can access district data.</p></div><ShieldCheck size={20} className="text-theme-primary" /></div>
        {overview.requests.length === 0 ? <p className="mt-4 text-sm text-theme-text-muted">No pending requests.</p> : <table className="mt-4 w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Vet</th><th>Registration</th><th>District</th><th>Submitted</th><th /></tr></thead><tbody>{overview.requests.map((request) => <tr key={request.id} className="border-b border-slate-100"><td className="py-3"><strong>{request.full_name}</strong><span className="block text-xs text-theme-text-muted">{request.email || request.phone}</span></td><td>{request.registration_number || 'Not provided'}</td><td>{request.requested_district}, {request.vet_state}</td><td>{new Date(request.created_at).toLocaleDateString()}</td><td className="text-right"><div className="flex justify-end gap-2"><button type="button" className="dashboard-primary-button" disabled={busy === request.id} onClick={() => reviewRequest(request.id, 'approve')}><CheckCircle2 size={15} /> Approve</button><button type="button" className="dashboard-secondary-button" disabled={busy === request.id} onClick={() => reviewRequest(request.id, 'reject')}><XCircle size={15} /> Decline</button></div></td></tr>)}</tbody></table>}
      </section>

      <section className="dashboard-panel overflow-x-auto"><div className="flex items-center justify-between gap-3"><div><h2 className="dashboard-section-title">All farms and locations</h2><p className="mt-1 text-sm text-theme-text-muted">Every farmer and co-op account represented in the system.</p></div><ShieldCheck size={20} className="text-theme-primary" /></div><table className="mt-4 w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Farm</th><th>Owner</th><th>District</th><th>Animals</th><th>Coordinates</th></tr></thead><tbody>{overview.farms.map((farm) => <tr key={farm.id} className="border-b border-slate-100"><td className="py-3"><strong>{farm.farm_name || 'Unnamed farm'}</strong><span className="block text-xs text-theme-text-muted">{farm.farm_id || 'Co-op account'}</span></td><td>{farm.full_name}</td><td>{farm.farm_district || 'Not provided'}, {farm.farm_state || ''}</td><td>{farm.total_animals}</td><td>{farm.hub_latitude != null && farm.hub_longitude != null ? `${farm.hub_latitude}, ${farm.hub_longitude}` : 'Not mapped'}</td></tr>)}</tbody></table></section>

      <section className="dashboard-panel overflow-x-auto">
        <div className="flex items-center justify-between gap-3"><h2 className="dashboard-section-title">Global animal registry</h2><Trash2 size={20} className="text-theme-primary" /></div>
        <form className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={createAnimal}><select className="auth-input-wrap" required value={animalForm.owner_id} onChange={(event) => setAnimalForm({ ...animalForm, owner_id: event.target.value })}><option value="">Select farm owner</option>{overview.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.farm_name || farm.full_name}</option>)}</select><input className="auth-input-wrap" required placeholder="Animal name" value={animalForm.name} onChange={(event) => setAnimalForm({ ...animalForm, name: event.target.value })} /><input className="auth-input-wrap" required placeholder="Display tag" value={animalForm.display_tag} onChange={(event) => setAnimalForm({ ...animalForm, display_tag: event.target.value })} /><input className="auth-input-wrap" required placeholder="8-15 character RFID" pattern="[A-Za-z0-9]{8,15}" maxLength="15" value={animalForm.rfid_tag} onChange={(event) => setAnimalForm({ ...animalForm, rfid_tag: event.target.value })} /><select className="auth-input-wrap" value={animalForm.species} onChange={(event) => setAnimalForm({ ...animalForm, species: event.target.value })}><option value="cow">Cow</option><option value="buffalo">Buffalo</option></select><input className="auth-input-wrap" required placeholder="Breed" value={animalForm.breed} onChange={(event) => setAnimalForm({ ...animalForm, breed: event.target.value })} /><input className="auth-input-wrap" type="number" min="0" placeholder="Age" value={animalForm.age} onChange={(event) => setAnimalForm({ ...animalForm, age: Number(event.target.value) })} /><button type="submit" className="dashboard-primary-button" disabled={busy === 'animal-create'}><Plus size={15} /> Add animal</button></form>
        <table className="mt-4 w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Animal</th><th>Farm</th><th>Species</th><th>Risk</th><th /></tr></thead><tbody>{animals.map((animal) => <tr key={animal.id} className="border-b border-slate-100"><td className="py-3"><strong>{animal.name}</strong><span className="block text-xs text-theme-text-muted">{animal.display_tag} · {animal.rfid_tag}</span></td><td>{animal.farm_name || animal.owner_name}</td><td className="capitalize">{animal.species}</td><td>{animal.current_risk_level || 'No snapshot'}</td><td className="text-right"><button type="button" className="dashboard-secondary-button" disabled={busy === animal.id} onClick={() => removeAnimal(animal)}><Trash2 size={15} /> Remove</button></td></tr>)}</tbody></table>
        {animals.length === 0 && <p className="mt-4 text-sm text-theme-text-muted">No active animals in the registry.</p>}
      </section>

      <section className="dashboard-panel overflow-x-auto">
        <div className="flex items-center justify-between gap-3"><h2 className="dashboard-section-title">All accounts</h2><UserCheck size={20} className="text-theme-primary" /></div>
        <table className="mt-4 w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Account</th><th>Role</th><th>Status</th><th>Created</th><th /></tr></thead><tbody>{overview.users.map((user) => <tr key={user.id} className="border-b border-slate-100"><td className="py-3"><strong>{user.full_name}</strong><span className="block text-xs text-theme-text-muted">{user.email || user.phone}</span></td><td className="capitalize">{user.role.replace('_', ' ')}</td><td><span className={user.is_active ? 'text-emerald-700' : 'text-red-700'}>{user.is_active ? 'Active' : 'Inactive'}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td><td className="text-right"><div className="flex justify-end gap-2">{user.role !== 'administrator' && <><button type="button" className="dashboard-secondary-button" disabled={busy === user.id} onClick={() => toggleUser(user)}>{user.is_active ? <UserX size={15} /> : <UserCheck size={15} />} {user.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" className="dashboard-secondary-button" disabled={busy === user.id} onClick={() => removeUser(user)}><Trash2 size={15} /> Remove</button></>}</div></td></tr>)}</tbody></table>
      </section>

      <p className="flex items-center gap-2 text-xs text-theme-text-muted"><ShieldCheck size={14} /> The main administrator account cannot be deactivated or created through signup.</p>
    </div>
  );
}
