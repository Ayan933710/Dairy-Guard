import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Copy, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { ErrorState, LoadingState } from '../shared/AsyncState.jsx';
import DistrictMap from '../shared/DistrictMap.jsx';
import { useAuth } from '../../lib/AuthContext.jsx';

function FarmModal({ farm, location, onClose }) {
  if (!farm) return null;
  return (
    <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dashboard-modal max-w-lg" role="dialog" aria-modal="true" aria-label="Farm details" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="dashboard-kicker">Farm detail</p><h2 className="font-display text-2xl text-theme-text-dark">{farm.farm_name || 'Unnamed farm'}</h2><p className="text-sm text-theme-text-muted">{farm.farm_id} · Owner: {farm.owner_name}</p></div>
          <button type="button" className="dashboard-secondary-button" onClick={onClose}>Close</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3"><span className="text-theme-text-muted">Total animals</span><strong className="mt-1 block text-lg">{farm.total_animals}</strong></div>
          <div className="rounded-lg bg-red-50 p-3"><span className="text-theme-text-muted">Mastitis risk</span><strong className="mt-1 block text-lg text-red-700">{farm.mastitis_risk_animals}</strong></div>
          <div className="col-span-2 rounded-lg bg-slate-50 p-3"><span className="text-theme-text-muted">Resolved location</span><strong className="mt-1 block">{location || 'Coordinates pending'}</strong><span className="mt-1 block text-xs text-theme-text-muted">Exact hub: {farm.hub_latitude}, {farm.hub_longitude}</span></div>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4"><h3 className="font-medium">Other important info</h3><p className="mt-1 text-sm text-theme-text-muted">{farm.amr_rising_animals > 0 ? `${farm.amr_rising_animals} animal(s) show rising AMR.` : 'No rising AMR signal in the current snapshot.'}</p></div>
      </section>
    </div>
  );
}

export default function VetDashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [locations, setLocations] = useState({});
  const [acknowledged, setAcknowledged] = useState(new Set());
  const [error, setError] = useState('');
  const activeTab = searchParams.get('section') || 'overview';
  const districtCenter = useMemo(() => [22.5726, 88.3639], []);
  const mockMarkers = useMemo(() => [
    { id: 'mock-nadia', position: [23.47, 88.56], label: 'Nadia demo farm', detail: 'Demo mastitis-risk location', color: '#dc2626', data: null },
    { id: 'mock-kolkata', position: districtCenter, label: 'Kolkata demo hub', detail: 'Demo AMR monitoring location', color: '#f59e0b', data: null },
  ], [districtCenter]);
  const buildMarkers = (type) => {
    const farmMarkers = (data?.farms || [])
      .filter((farm) => Number.isFinite(Number(farm.hub_latitude)) && Number.isFinite(Number(farm.hub_longitude)))
      .filter((farm) => type === 'mastitis' ? farm.mastitis_risk_animals > 0 : farm.amr_rising_animals > 0)
      .map((farm) => ({
        id: farm.farm_owner_id,
        position: [Number(farm.hub_latitude), Number(farm.hub_longitude)],
        label: farm.farm_name || farm.farm_id || 'District farm',
        detail: type === 'mastitis' ? `${farm.mastitis_risk_animals} at-risk animals` : `${farm.amr_rising_animals} rising AMR signals`,
        color: type === 'mastitis' ? '#dc2626' : '#f59e0b',
        data: farm,
      }));
    return farmMarkers.length ? farmMarkers : mockMarkers;
  };
  const mastitisMarkers = useMemo(() => buildMarkers('mastitis'), [data?.farms, mockMarkers]);
  const amrMarkers = useMemo(() => buildMarkers('amr'), [data?.farms, mockMarkers]);

  useEffect(() => {
    api.get('/vet/dashboard').then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  if (data.setupRequired) {
    return <DistrictSetupRequest user={user} />;
  }

  const mastitisFarms = data.farms.filter((farm) => farm.mastitis_risk_animals > 0).length;
  const amrFarms = data.farms.filter((farm) => farm.amr_rising_animals > 0).length;

  return (
    <div className="space-y-6">
      <header><p className="dashboard-kicker">Veterinary Officer Console</p><h1 className="dashboard-page-title">District health view</h1><p className="mt-1 text-sm text-theme-text-muted">{data.district} · {data.farms.length} farms in scope</p></header>
      {activeTab === 'overview' && <>
        <div className="grid gap-4 sm:grid-cols-3"><Metric label="Total farms in district" value={data.farms.length} icon={ClipboardCheck} /><Metric label="Farms with mastitis risk" value={mastitisFarms} icon={ShieldAlert} /><Metric label="Farms with rising AMR" value={amrFarms} icon={AlertTriangle} /></div>
        <section className="dashboard-panel overflow-x-auto"><h2 className="dashboard-section-title">District farms</h2><table className="mt-4 w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Farm / ID</th><th>Total animals</th><th>Mastitis risk</th><th>Location</th></tr></thead><tbody>{data.farms.map((farm) => <tr key={farm.farm_owner_id} className="border-b border-slate-100"><td className="py-3"><strong>{farm.farm_name || 'Unnamed farm'}</strong><span className="block text-xs text-theme-text-muted">{farm.farm_id} · {farm.owner_name}</span></td><td>{farm.total_animals}</td><td className={farm.mastitis_risk_animals ? 'font-semibold text-red-700' : ''}>{farm.mastitis_risk_animals}</td><td>{locations[farm.farm_owner_id] || (farm.hub_latitude && farm.hub_longitude ? `${farm.hub_latitude}, ${farm.hub_longitude}` : 'Coordinates pending')}</td></tr>)}</tbody></table></section>
      </>}

      {activeTab === 'maps' && <div className="grid gap-6 xl:grid-cols-2"><section className="dashboard-panel"><h2 className="dashboard-section-title">Mastitis risk map</h2><p className="mb-4 text-sm text-theme-text-muted">Red dots mark farms with high mastitis-risk animals.</p><DistrictMap center={districtCenter} markers={mastitisMarkers} onSelect={setSelectedFarm} /></section><section className="dashboard-panel"><h2 className="dashboard-section-title">AMR trend map</h2><p className="mb-4 text-sm text-theme-text-muted">Amber dots mark farms with a rising AMR snapshot.</p><DistrictMap center={districtCenter} markers={amrMarkers} onSelect={setSelectedFarm} /></section></div>}

      {activeTab === 'recommendations' && <section className="dashboard-panel"><h2 className="dashboard-section-title">Action queue</h2><div className="mt-4 space-y-3">{data.recommendations.length ? data.recommendations.map((item) => { const isAcknowledged = acknowledged.has(item.farm_owner_id); return <article key={item.farm_owner_id} className={`flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4 ${isAcknowledged ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'}`}><div><h3 className="font-medium">{item.farm_name || 'Unnamed farm'}</h3><p className="text-sm text-theme-text-muted">{item.owner_name} · {item.hub_latitude}, {item.hub_longitude}</p><p className="mt-2 text-sm text-red-800">{item.action} ({item.mastitis_risk_animals} at-risk animals)</p></div><button type="button" className="dashboard-secondary-button" disabled={isAcknowledged} onClick={() => setAcknowledged((current) => new Set(current).add(item.farm_owner_id))}><CheckCircle2 size={14} /> {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}</button></article>; }) : <p className="text-sm text-theme-text-muted">No urgent farm recommendations.</p>}</div></section>}

      {activeTab === 'history' && <section className="dashboard-panel overflow-x-auto"><h2 className="dashboard-section-title">Yearly farm risk history</h2><table className="mt-4 w-full min-w-[680px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-theme-text-muted"><tr><th className="py-3">Year</th><th>Farm</th><th>Peak mastitis score</th><th>Peak AMR score</th><th>Affected animals</th></tr></thead><tbody>{data.history.map((item) => <tr key={`${item.year}-${item.farm_owner_id}`} className="border-b border-slate-100"><td className="py-3">{item.year}</td><td>{item.farm_name || item.farm_id}</td><td>{item.peak_mastitis_score ?? '—'}</td><td>{item.peak_amr_score ?? '—'}</td><td>{item.affected_animals}</td></tr>)}</tbody></table></section>}
      <FarmModal farm={selectedFarm} location={selectedFarm ? locations[selectedFarm.farm_owner_id] : ''} onClose={() => setSelectedFarm(null)} />
    </div>
  );
}

function DistrictSetupRequest({ user }) {
  const [district, setDistrict] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [requestError, setRequestError] = useState('');
  const administratorEmail = import.meta.env.VITE_ADMIN_CONTACT_EMAIL || 'admin@dairyguard.ai';
  const requestText = `Please add my veterinary district in DairyGuard.\nName: ${user?.full_name || ''}\nRegistration number: ${user?.registration_number || 'Not provided'}\nPhone: ${user?.phone || 'Not provided'}\nRequested district: ${district || 'Not provided'}`;

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestText);
      setCopied(true);
      setCopyError('');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Clipboard access is unavailable. Select and copy the request text manually.');
    }
  }

  async function submitRequest() {
    if (!district.trim()) {
      setRequestError('Enter your district before submitting the request.');
      return;
    }
    try {
      setRequestError('');
      setRequestStatus('Submitting...');
      await api.post('/vet/district-requests', { requested_district: district.trim() });
      setRequestStatus('Request submitted. An administrator can now approve it.');
    } catch (error) {
      setRequestStatus('');
      setRequestError(error.message);
    }
  }

  return (
    <section className="dashboard-panel max-w-2xl">
      <p className="dashboard-kicker">Veterinary Officer Console</p>
      <h1 className="dashboard-page-title">District setup required</h1>
      <p className="mt-2 text-sm text-theme-text-muted">
        Your account does not have a vet district yet. An administrator must add it before you can view district farm health data.
      </p>

      <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-slate-700">
        <h2 className="font-display text-lg text-slate-900">How to ask an administrator</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Enter the district where you serve.</li>
          <li>Copy the prepared request or open the administrator email.</li>
          <li>Ask them to update your vet district in your DairyGuard account.</li>
        </ol>
      </div>

      <label className="mt-5 block text-sm">
        <span className="mb-2 block font-medium text-slate-700">Requested district</span>
        <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="e.g. Nadia" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
      </label>
      <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">{requestText}</pre>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="dashboard-primary-button" onClick={copyRequest}><Copy size={15} /> {copied ? 'Copied' : 'Copy request'}</button>
        <button type="button" className="dashboard-primary-button" onClick={submitRequest}><ShieldCheck size={15} /> Submit in DairyGuard</button>
        <a className="dashboard-secondary-button" href={`mailto:${administratorEmail}?subject=DairyGuard%20vet%20district%20request&body=${encodeURIComponent(requestText)}`}><Mail size={15} /> Email administrator</a>
      </div>
      <p className="mt-3 text-xs text-theme-text-muted">Administrator contact: {administratorEmail}</p>
      {copyError && <p className="mt-2 text-xs text-red-600" role="alert">{copyError}</p>}
      {requestStatus && <p className="mt-2 text-xs text-emerald-700" role="status">{requestStatus}</p>}
      {requestError && <p className="mt-2 text-xs text-red-600" role="alert">{requestError}</p>}
    </section>
  );
}

function Metric({ label, value, icon: Icon }) {
  return <div className="dashboard-panel flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-theme-primary"><Icon size={18} /></span><div><p className="text-xs text-theme-text-muted">{label}</p><strong className="font-display text-2xl">{value}</strong></div></div>;
}
