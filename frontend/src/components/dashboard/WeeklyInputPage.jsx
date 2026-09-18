import { useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../lib/apiClient.js';
import { useFetch } from '../../lib/useFetch.js';
import { fetchHerd } from '../../lib/herdApi.js';
import { LoadingState, ErrorState } from '../shared/AsyncState.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';

const initialForm = {
  week_start: new Date().toISOString().slice(0, 10),
  morning_milking_count: '1',
  evening_milking_count: '1',
  feed_kg: '',
  worker_hygiene: 'good',
  antidote_given: 'false',
  antidote_animal_id: '',
};

export default function WeeklyInputPage() {
  const { t } = useLanguage();
  const { data: animals, loading: herdLoading } = useFetch(fetchHerd, []);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.post('/weekly-inputs', { ...form, antidote_given: form.antidote_given === 'true', antidote_animal_id: form.antidote_animal_id || null });
      setMessage(t('weeklySaved'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (herdLoading) return <LoadingState label={t('loadingHerd')} />;

  return (
    <div className="space-y-6">
      <header><p className="dashboard-kicker">{t('weeklyCheckIn')}</p><h1 className="dashboard-page-title">{t('weeklyInputTitle')}</h1><p className="mt-1 text-sm text-theme-text-muted">{t('weeklyInputDescription')}</p></header>
      <form onSubmit={submit} className="dashboard-panel dashboard-animal-form max-w-3xl">
        <label><span>{t('weekStarting')}</span><input name="week_start" type="date" value={form.week_start} onChange={update} required /></label>
        <label><span>{t('morningMilking')}</span><input name="morning_milking_count" type="number" min="0" max="20" inputMode="numeric" value={form.morning_milking_count} onChange={update} required /></label>
        <label><span>{t('eveningMilking')}</span><input name="evening_milking_count" type="number" min="0" max="20" inputMode="numeric" value={form.evening_milking_count} onChange={update} required /></label>
        <label><span>{t('feedKg')}</span><input name="feed_kg" type="number" min="0" step="0.1" inputMode="decimal" value={form.feed_kg} onChange={update} required /></label>
        <label><span>{t('workerHygiene')}</span><select name="worker_hygiene" value={form.worker_hygiene} onChange={update}><option value="good">{t('good')}</option><option value="needs_attention">{t('needsAttention')}</option><option value="poor">{t('poor')}</option></select></label>
        <label><span>{t('antidoteGiven')}</span><select name="antidote_given" value={form.antidote_given} onChange={update}><option value="false">{t('no')}</option><option value="true">{t('yes')}</option></select></label>
        {form.antidote_given === 'true' && <label><span>{t('antidoteAnimal')}</span><select name="antidote_animal_id" value={form.antidote_animal_id} onChange={update} required><option value="">{t('selectAnimal')}</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.displayTag}</option>)}</select></label>}
        {message && <p className="dashboard-form-success" role="status">{message}</p>}
        {error && <p className="dashboard-form-error" role="alert">{error}</p>}
        <div className="flex justify-end sm:col-span-2"><button type="submit" className="dashboard-primary-button" disabled={saving}><Save size={15} /> {saving ? t('saving') : t('saveWeeklyInput')}</button></div>
      </form>
    </div>
  );
}