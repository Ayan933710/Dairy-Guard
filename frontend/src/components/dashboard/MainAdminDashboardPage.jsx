import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, RefreshCw, ShieldCheck, Trash2, UserCheck, UserX, XCircle } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { ErrorState, LoadingState } from '../shared/AsyncState.jsx';
import LocationLink from '../shared/LocationLink.jsx';
import DistrictMap from '../shared/DistrictMap.jsx';

const STAT_LABELS = [
  ['farms', 'Total farms'],
  ['animals', 'Total animals'],
  ['users', 'Registered accounts'],
  ['highRiskAnimals', 'High-risk animals'],
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

const STATE_CENTERS = {
  'Andhra Pradesh': [15.9129, 79.7400],
  'Arunachal Pradesh': [28.2180, 94.7278],
  Assam: [26.2006, 92.9376],
  Bihar: [25.0961, 85.3131],
  'Chhattisgarh': [21.2787, 81.8661],
  Goa: [15.2993, 74.1240],
  Gujarat: [22.2587, 71.1924],
  Haryana: [29.0588, 76.0856],
  'Himachal Pradesh': [31.1048, 77.1734],
  Jharkhand: [23.6102, 85.2799],
  Karnataka: [15.3173, 75.7139],
  Kerala: [10.8505, 76.2711],
  'Madhya Pradesh': [22.9734, 78.6569],
  Maharashtra: [19.7515, 75.7139],
  Manipur: [24.8170, 93.9368],
  Meghalaya: [25.4670, 91.3662],
  Mizoram: [23.1645, 92.9376],
  Nagaland: [26.1584, 94.5624],
  Odisha: [20.9517, 85.0985],
  Punjab: [31.1471, 75.3412],
  Rajasthan: [27.0238, 74.2179],
  Sikkim: [27.5330, 88.5122],
  'Tamil Nadu': [11.1271, 78.6569],
  Telangana: [17.1232, 79.2088],
  Tripura: [23.9408, 91.9882],
  'Uttar Pradesh': [26.8467, 80.9462],
  'Uttarakhand': [30.3165, 78.0322],
  'West Bengal': [22.9868, 87.8550],
  'Andaman and Nicobar Islands': [11.7401, 92.6586],
  Chandigarh: [30.7333, 76.7794],
  'Dadra and Nagar Haveli and Daman and Diu': [20.1809, 73.0169],
  Delhi: [28.6139, 77.2090],
  'Jammu and Kashmir': [33.7782, 76.5762],
  Ladakh: [34.1526, 77.5770],
  Lakshadweep: [10.5667, 72.6417],
  Puducherry: [11.9416, 79.8083],
};

export default function MainAdminDashboardPage({ includeVetRequests = true, showOnlyAnimals = false, showRegionalAnalysis = false }) {
  const [overview, setOverview] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [animalToRemove, setAnimalToRemove] = useState(null);
  const [removePhrase, setRemovePhrase] = useState('');
  const [userToRemove, setUserToRemove] = useState(null);
  const [userRemovePhrase, setUserRemovePhrase] = useState('');
  const [selectedState, setSelectedState] = useState('');
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
    if (userRemovePhrase.trim().toUpperCase() !== 'REMOVE') return;
    try {
      setBusy(user.id);
      await api.del(`/admin/users/${user.id}`);
      setOverview((current) => ({ ...current, users: current.users.filter((item) => item.id !== user.id), stats: { ...current.stats, users: Math.max(0, current.stats.users - 1), farms: ['farmer', 'cooperative_admin'].includes(user.role) ? Math.max(0, current.stats.farms - 1) : current.stats.farms } }));
      setMessage(`${user.full_name}'s account was removed.`);
      setUserToRemove(null);
      setUserRemovePhrase('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function removeAnimal(animal) {
    if (removePhrase.trim().toUpperCase() !== 'REMOVE') return;
    try {
      setBusy(animal.id);
      await api.del(`/admin/animals/${animal.id}`);
      setAnimals((current) => current.filter((item) => item.id !== animal.id));
      setMessage(`${animal.name} was removed from the registry.`);
      setAnimalToRemove(null);
      setRemovePhrase('');
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

  const farms = overview?.farms || [];

  const availableStates = useMemo(() => {
    const states = [...new Set([...INDIAN_STATES, ...farms.map((farm) => farm.farm_state).filter(Boolean)])];
    return states;
  }, [farms]);

  useEffect(() => {
    if (!showRegionalAnalysis || !availableStates.length) return;
    if (!selectedState || !availableStates.includes(selectedState)) {
      const fallbackState = availableStates.includes('West Bengal') ? 'West Bengal' : availableStates[0];
      setSelectedState(fallbackState);
    }
  }, [availableStates, selectedState, showRegionalAnalysis]);

  const regionalFarms = useMemo(() => {
    const filtered = farms.filter((farm) => (!selectedState ? true : (farm.farm_state || '').trim() === selectedState));
    return filtered.filter((farm) => Number.isFinite(Number(farm.hub_latitude)) && Number.isFinite(Number(farm.hub_longitude)));
  }, [farms, selectedState]);

  const stateCenter = useMemo(() => {
    if (selectedState && STATE_CENTERS[selectedState]) {
      return STATE_CENTERS[selectedState];
    }
    if (!regionalFarms.length) return [22.5726, 88.3639];
    const total = regionalFarms.reduce((accumulator, farm) => {
      accumulator[0] += Number(farm.hub_latitude);
      accumulator[1] += Number(farm.hub_longitude);
      return accumulator;
    }, [0, 0]);
    return [total[0] / regionalFarms.length, total[1] / regionalFarms.length];
  }, [regionalFarms, selectedState]);

  const mastitisMarkers = useMemo(() => regionalFarms.map((farm) => ({
    id: `${farm.farm_id || farm.id}-mastitis`,
    position: [Number(farm.hub_latitude), Number(farm.hub_longitude)],
    label: farm.farm_name || farm.farm_id || 'Farm hub',
    detail: Number(farm.mastitis_risk_animals) > 0 ? `${farm.mastitis_risk_animals} at-risk animals` : 'No mastitis alert',
    color: Number(farm.mastitis_risk_animals) > 0 ? '#dc2626' : '#64748b',
    data: farm,
  })), [regionalFarms]);

  const amrMarkers = useMemo(() => regionalFarms.map((farm) => ({
    id: `${farm.farm_id || farm.id}-amr`,
    position: [Number(farm.hub_latitude), Number(farm.hub_longitude)],
    label: farm.farm_name || farm.farm_id || 'Farm hub',
    detail: Number(farm.amr_rising_animals) > 0 ? `${farm.amr_rising_animals} rising AMR signals` : 'No AMR alert',
    color: Number(farm.amr_rising_animals) > 0 ? '#f59e0b' : '#64748b',
    data: farm,
  })), [regionalFarms]);

  const pageHeaderTitle = showOnlyAnimals ? 'Animal' : showRegionalAnalysis ? 'Regional Analysis' : 'Account overview';
  const pageHeaderSubtitle = showOnlyAnimals ? 'Global animal registry for every registered animal across the platform.' : showRegionalAnalysis ? 'State-level monitoring of hub risk signals across the region.' : 'Full visibility across farms, animals, accounts, and veterinary approvals.';

  if (error && !overview) return <ErrorState message={error} onRetry={loadOverview} />;
  if (!overview) return <LoadingState label="Loading administrator console..." />;

  return (
    <div className="admin-console admin-overview space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="dashboard-kicker">Main Administrator</p>
          <h1 className="dashboard-page-title">{pageHeaderTitle}</h1>
          <p className="mt-1 text-sm text-theme-text-muted">{pageHeaderSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!showOnlyAnimals && !showRegionalAnalysis && (
            <button type="button" className="dashboard-primary-button" onClick={() => setShowCreate((current) => !current)}>
              <Plus size={15} /> Add account or farm
            </button>
          )}
          <button type="button" className="dashboard-secondary-button" onClick={loadOverview}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {message && <p className="dashboard-form-success" role="status">{message}</p>}
      {error && <p className="dashboard-form-error" role="alert">{error}</p>}

      {showRegionalAnalysis && (
        <section className="space-y-6">
          <div className="dashboard-panel">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="dashboard-kicker">Regional risk map</p>
                <h2 className="dashboard-section-title">Hub monitoring by state</h2>
              </div>
              <label className="flex flex-col gap-2 text-sm text-theme-text-muted">
                <span>State</span>
                <select value={selectedState} onChange={(event) => setSelectedState(event.target.value)} className="auth-input-wrap min-w-[220px]">
                  {availableStates.length ? availableStates.map((state) => <option key={state} value={state}>{state}</option>) : <option value="">No states available</option>}
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="dashboard-panel">
              <h2 className="dashboard-section-title">Mastitis hub map</h2>
              <p className="mb-4 text-sm text-theme-text-muted">Red dots mark farm hubs with mastitis risk alerts in {selectedState || 'the selected state'}.</p>
              <DistrictMap center={stateCenter} markers={mastitisMarkers.length ? mastitisMarkers : [{ id: 'no-mastitis', position: stateCenter, label: 'No mastitis alerts', detail: 'No hub is reporting mastitis risk in this state.', color: '#dc2626', data: null }]} onSelect={() => {}} />
            </section>

            <section className="dashboard-panel">
              <h2 className="dashboard-section-title">AMR hub map</h2>
              <p className="mb-4 text-sm text-theme-text-muted">Orange dots mark farm hubs with rising AMR signals in {selectedState || 'the selected state'}.</p>
              <DistrictMap center={stateCenter} markers={amrMarkers.length ? amrMarkers : [{ id: 'no-amr', position: stateCenter, label: 'No AMR alerts', detail: 'No hub is reporting AMR escalation in this state.', color: '#f59e0b', data: null }]} onSelect={() => {}} />
            </section>
          </div>
        </section>
      )}

      {showCreate && (
        <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <section className="dashboard-modal max-w-3xl" role="dialog" aria-modal="true" aria-labelledby="admin-create-account-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker">Create entry</p>
                <h2 id="admin-create-account-title" className="font-display text-2xl text-theme-text-dark">Create account or farm</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close create account dialog">×</button>
            </div>

            <p className="mt-2 text-sm text-theme-text-muted">Creating a vet account sends it to the approval queue automatically.</p>
            <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={createAccount}>
              <select className="auth-input-wrap" value={accountForm.role} onChange={(event) => setAccountForm({ ...accountForm, role: event.target.value })}>
                <option value="farmer">Farmer / Farm</option>
                <option value="vet">Vet</option>
                <option value="cooperative_admin">Co-op Admin</option>
              </select>
              <div className="sm:col-span-2" />
              <input className="auth-input-wrap" placeholder="Full name" required value={accountForm.full_name} onChange={(event) => setAccountForm({ ...accountForm, full_name: event.target.value })} />
              <input className="auth-input-wrap" type="email" placeholder="Email" required value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} />
              <input className="auth-input-wrap" type="password" minLength="8" placeholder="Temporary password" required value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} />
              <input className="auth-input-wrap" placeholder="Phone" value={accountForm.phone} onChange={(event) => setAccountForm({ ...accountForm, phone: event.target.value })} />

              {accountForm.role !== 'vet' && (
                <>
                  <input className="auth-input-wrap" placeholder="Farm name" value={accountForm.farm_name} onChange={(event) => setAccountForm({ ...accountForm, farm_name: event.target.value })} />
                  <input className="auth-input-wrap" placeholder="Farm state" value={accountForm.farm_state} onChange={(event) => setAccountForm({ ...accountForm, farm_state: event.target.value })} />
                  <input className="auth-input-wrap" placeholder="Farm district" value={accountForm.farm_district} onChange={(event) => setAccountForm({ ...accountForm, farm_district: event.target.value })} />
                  <input className="auth-input-wrap" placeholder="Registration number (optional)" value={accountForm.registration_number} onChange={(event) => setAccountForm({ ...accountForm, registration_number: event.target.value })} />
                </>
              )}

              {accountForm.role === 'vet' && (
                <>
                  <input className="auth-input-wrap" placeholder="Vet state" required value={accountForm.vet_state} onChange={(event) => setAccountForm({ ...accountForm, vet_state: event.target.value })} />
                  <input className="auth-input-wrap" placeholder="Vet district" required value={accountForm.vet_district} onChange={(event) => setAccountForm({ ...accountForm, vet_district: event.target.value })} />
                  <input className="auth-input-wrap sm:col-span-2" placeholder="Registration number" required value={accountForm.registration_number} onChange={(event) => setAccountForm({ ...accountForm, registration_number: event.target.value })} />
                </>
              )}

              {createError && <p className="sm:col-span-2 dashboard-form-error" role="alert">{createError}</p>}

              <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
                <button type="button" className="dashboard-secondary-button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="dashboard-primary-button" disabled={busy === 'create'}>
                  <Plus size={15} /> Create account
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {!showOnlyAnimals && !showRegionalAnalysis && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STAT_LABELS.map(([key, label]) => (
              <section className={`dashboard-panel admin-overview-stat-card admin-overview-stat-card--${key}`} key={key}>
                <p className="text-xs text-theme-text-muted">{label}</p>
                <p className="mt-2 font-display text-3xl text-theme-text-dark">{overview.stats[key]}</p>
              </section>
            ))}
          </div>

          {includeVetRequests && (
            <section className="dashboard-panel admin-overview-section admin-overview-section--requests overflow-x-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="dashboard-section-title">Vet approval requests</h2>
                  <p className="mt-1 text-sm text-theme-text-muted">Only approved vets can access district data.</p>
                </div>
                <ShieldCheck size={20} className="text-theme-primary" />
              </div>
              {overview.requests.length === 0 ? <p className="mt-4 text-sm text-theme-text-muted">No pending requests.</p> : (
                <table className="mt-4 w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted">
                    <tr>
                      <th className="py-3">Vet</th>
                      <th>Registration</th>
                      <th>District</th>
                      <th>Submitted</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {overview.requests.map((request) => (
                      <tr key={request.id} className="border-b border-slate-100">
                        <td className="py-3"><strong>{request.full_name}</strong><span className="block text-xs text-theme-text-muted">{request.email || request.phone}</span></td>
                        <td>{request.registration_number || 'Not provided'}</td>
                        <td>{request.requested_district}, {request.vet_state}</td>
                        <td>{new Date(request.created_at).toLocaleDateString()}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="dashboard-primary-button" disabled={busy === request.id} onClick={() => reviewRequest(request.id, 'approve')}><CheckCircle2 size={15} /> Approve</button>
                            <button type="button" className="dashboard-secondary-button" disabled={busy === request.id} onClick={() => reviewRequest(request.id, 'reject')}><XCircle size={15} /> Decline</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          <section className="dashboard-panel admin-overview-section admin-overview-section--farms overflow-x-auto">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="dashboard-section-title">All farms and locations</h2>
                <p className="mt-1 text-sm text-theme-text-muted">Every farmer and co-op account represented in the system.</p>
              </div>
              <ShieldCheck size={20} className="text-theme-primary" />
            </div>
            <table className="mt-4 w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted">
                <tr>
                  <th className="py-3">Farm</th>
                  <th>Owner</th>
                  <th>District</th>
                  <th>Animals</th>
                  <th>Location</th>
                  <th>Contacts</th>
                </tr>
              </thead>
              <tbody>
                {overview.farms.map((farm) => (
                  <tr key={farm.id} className="border-b border-slate-100">
                    <td className="py-3"><strong>{farm.farm_name || 'Unnamed farm'}</strong><span className="block text-xs text-theme-text-muted">{farm.farm_id || 'Co-op account'}</span></td>
                    <td>{farm.full_name}</td>
                    <td>{farm.farm_district || 'Not provided'}, {farm.farm_state || ''}</td>
                    <td>{farm.total_animals}</td>
                    <td><LocationLink latitude={farm.hub_latitude} longitude={farm.hub_longitude} /></td>
                    <td>
                      <div className="space-y-1">
                        {farm.email ? <span className="block">{farm.email}</span> : <span className="block text-theme-text-muted">No email</span>}
                        {farm.phone ? <span className="block">{farm.phone}</span> : <span className="block text-theme-text-muted">No phone</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {showOnlyAnimals && (
        <section className="dashboard-panel admin-overview-section admin-overview-section--animals overflow-x-auto">
          <div className="flex items-center justify-between gap-3">
            <h2 className="dashboard-section-title">Global animal registry</h2>
            <Trash2 size={20} className="text-theme-primary" />
          </div>
          <form className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={createAnimal}>
            <select className="auth-input-wrap" required value={animalForm.owner_id} onChange={(event) => setAnimalForm({ ...animalForm, owner_id: event.target.value })}>
              <option value="">Select farm owner</option>
              {overview.farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.farm_name || farm.full_name}</option>)}
            </select>
            <input className="auth-input-wrap" required placeholder="Animal name" value={animalForm.name} onChange={(event) => setAnimalForm({ ...animalForm, name: event.target.value })} />
            <input className="auth-input-wrap" required placeholder="Display tag" value={animalForm.display_tag} onChange={(event) => setAnimalForm({ ...animalForm, display_tag: event.target.value })} />
            <input className="auth-input-wrap" required placeholder="8-15 character RFID" pattern="[A-Za-z0-9]{8,15}" maxLength="15" value={animalForm.rfid_tag} onChange={(event) => setAnimalForm({ ...animalForm, rfid_tag: event.target.value })} />
            <select className="auth-input-wrap" value={animalForm.species} onChange={(event) => setAnimalForm({ ...animalForm, species: event.target.value })}>
              <option value="cow">Cow</option>
              <option value="buffalo">Buffalo</option>
            </select>
            <input className="auth-input-wrap" required placeholder="Breed" value={animalForm.breed} onChange={(event) => setAnimalForm({ ...animalForm, breed: event.target.value })} />
            <input className="auth-input-wrap" type="number" min="0" placeholder="Age" value={animalForm.age} onChange={(event) => setAnimalForm({ ...animalForm, age: Number(event.target.value) })} />
            <button type="submit" className="dashboard-primary-button" disabled={busy === 'animal-create'}>
              <Plus size={15} /> Add animal
            </button>
          </form>
          <table className="mt-4 w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted">
              <tr>
                <th className="py-3">Animal</th>
                <th>Farm</th>
                <th>Species</th>
                <th>RFID</th>
                <th>Risk</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {animals.map((animal) => (
                <tr key={animal.id} className="border-b border-slate-100">
                  <td className="py-3"><strong>{animal.name}</strong><span className="block text-xs text-theme-text-muted">{animal.display_tag}</span></td>
                  <td>{animal.farm_name || animal.owner_name}</td>
                  <td className="capitalize">{animal.species}</td>
                  <td>{animal.rfid_tag}</td>
                  <td>{animal.current_risk_level || 'No snapshot'}</td>
                  <td className="text-right">
                    <button type="button" className="dashboard-secondary-button" disabled={busy === animal.id} onClick={() => { setAnimalToRemove(animal); setRemovePhrase(''); }}>
                      <Trash2 size={15} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {animals.length === 0 && <p className="mt-4 text-sm text-theme-text-muted">No active animals in the registry.</p>}
        </section>
      )}

      {animalToRemove && (
        <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={() => setAnimalToRemove(null)}>
          <section className="dashboard-modal max-w-lg" role="dialog" aria-modal="true" aria-labelledby="admin-remove-animal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-red-700">Permanent action</p>
                <h2 id="admin-remove-animal-title" className="font-display text-2xl text-theme-text-dark">Remove animal</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setAnimalToRemove(null)} aria-label="Close remove animal dialog">×</button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-theme-text-muted">Name</dt><dd className="font-medium">{animalToRemove.name}</dd></div>
              <div><dt className="text-theme-text-muted">Animal</dt><dd className="font-medium capitalize">{animalToRemove.species}</dd></div>
              <div><dt className="text-theme-text-muted">Animal ID</dt><dd className="font-medium">{animalToRemove.display_tag}</dd></div>
              <div><dt className="text-theme-text-muted">RFID</dt><dd className="font-medium">{animalToRemove.rfid_tag}</dd></div>
              <div><dt className="text-theme-text-muted">Breed</dt><dd className="font-medium">{animalToRemove.breed}</dd></div>
              <div><dt className="text-theme-text-muted">Age</dt><dd className="font-medium">{animalToRemove.age} years</dd></div>
            </dl>
            <p className="mt-5 text-sm text-red-700">Type <strong>REMOVE</strong> to confirm this animal will be removed.</p>
            <input className="auth-input-wrap mt-2 w-full" value={removePhrase} onChange={(event) => setRemovePhrase(event.target.value)} placeholder="Type REMOVE" autoComplete="off" />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="dashboard-secondary-button" onClick={() => setAnimalToRemove(null)}>Cancel</button>
              <button type="button" className="dashboard-primary-button bg-red-700 hover:bg-red-800" disabled={removePhrase.trim().toUpperCase() !== 'REMOVE'} onClick={() => removeAnimal(animalToRemove)}><Trash2 size={15} /> Remove animal</button>
            </div>
          </section>
        </div>
      )}

      {userToRemove && (
        <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={() => setUserToRemove(null)}>
          <section className="dashboard-modal max-w-lg" role="dialog" aria-modal="true" aria-labelledby="admin-remove-user-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-red-700">Permanent action</p>
                <h2 id="admin-remove-user-title" className="font-display text-2xl text-theme-text-dark">Remove account</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setUserToRemove(null)} aria-label="Close remove account dialog">×</button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-theme-text-muted">Name</dt><dd className="font-medium">{userToRemove.full_name}</dd></div>
              <div><dt className="text-theme-text-muted">Role</dt><dd className="font-medium capitalize">{userToRemove.role.replace('_', ' ')}</dd></div>
              <div><dt className="text-theme-text-muted">Email</dt><dd className="font-medium">{userToRemove.email || 'Not provided'}</dd></div>
              <div><dt className="text-theme-text-muted">Phone</dt><dd className="font-medium">{userToRemove.phone || 'Not provided'}</dd></div>
            </dl>
            <p className="mt-5 text-sm text-red-700">Type <strong>REMOVE</strong> to permanently remove this account and its associated records.</p>
            <input className="auth-input-wrap mt-2 w-full" value={userRemovePhrase} onChange={(event) => setUserRemovePhrase(event.target.value)} placeholder="Type REMOVE" autoComplete="off" />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="dashboard-secondary-button" onClick={() => setUserToRemove(null)}>Cancel</button>
              <button type="button" className="dashboard-primary-button bg-red-700 hover:bg-red-800" disabled={userRemovePhrase.trim().toUpperCase() !== 'REMOVE'} onClick={() => removeUser(userToRemove)}><Trash2 size={15} /> Remove account</button>
            </div>
          </section>
        </div>
      )}

      {!showOnlyAnimals && !showRegionalAnalysis && (
        <section className="dashboard-panel admin-overview-section admin-overview-section--accounts overflow-x-auto">
          <div className="flex items-center justify-between gap-3"><h2 className="dashboard-section-title">All accounts</h2><UserCheck size={20} className="text-theme-primary" /></div>
          <table className="mt-4 w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted">
              <tr>
                <th className="py-3">Account</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overview.users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="py-3"><strong>{user.full_name}</strong><span className="block text-xs text-theme-text-muted">{user.email || user.phone}</span></td>
                  <td className="capitalize">{user.role.replace('_', ' ')}</td>
                  <td><span className={user.is_active ? 'text-emerald-700' : 'text-red-700'}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      {user.role !== 'administrator' && (
                        <>
                          <button type="button" className="dashboard-secondary-button" disabled={busy === user.id} onClick={() => toggleUser(user)}>{user.is_active ? <UserX size={15} /> : <UserCheck size={15} />} {user.is_active ? 'Deactivate' : 'Activate'}</button>
                          <button type="button" className="dashboard-secondary-button" disabled={busy === user.id} onClick={() => { setUserToRemove(user); setUserRemovePhrase(''); }}><Trash2 size={15} /> Remove</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!showOnlyAnimals && !showRegionalAnalysis && (
        <p className="flex items-center gap-2 text-xs text-theme-text-muted"><ShieldCheck size={14} /> The main administrator account cannot be deactivated or created through signup.</p>
      )}
    </div>
  );
}
