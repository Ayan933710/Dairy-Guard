import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { riskColor } from '../../data/herd.js';
import RiskBadge from './RiskBadge.jsx';
import InteractiveCard from '../shared/InteractiveCard.jsx';
import { LoadingState, ErrorState } from '../shared/AsyncState.jsx';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { useFetch } from '../../lib/useFetch.js';
import { fetchHerd, createAnimal } from '../../lib/herdApi.js';

const cardGroupVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};

function StatCard({ label, value, sub, to }) {
  return (
    <InteractiveCard className="rounded-xl">
      <Link
        to={to}
        className="focus-ring block rounded-xl border border-slate-200 bg-theme-bg-card p-5 shadow-sm transition-shadow hover:border-sky-300 hover:shadow-[0_16px_36px_rgba(14,165,233,0.12)]"
        aria-label={`${label}: ${value}. Open details`}
      >
        <p className="text-xs text-milk-dim">{label}</p>
        <p className="mt-2 font-display text-3xl text-milk">{value}</p>
        {sub && <p className="mt-1 text-xs text-milk-dim">{sub}</p>}
      </Link>
    </InteractiveCard>
  );
}

function HerdCard({ animal, liveData }) {
  return (
    <InteractiveCard className="rounded-xl">
      <Link
        to={`/dashboard/species/${animal.species}/${animal.id}`}
        className="focus-ring flex min-h-[138px] min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-theme-bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-[0_12px_30px_rgba(14,165,233,0.12)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-base text-milk">{animal.name}</p>
            <p className="text-xs capitalize text-milk-dim">
              {animal.species} · {animal.displayTag}
            </p>
            <p className="mt-1 text-xs text-milk-dim">RFID: {animal.rfidTag}</p>
          </div>
          <div
            className="grid h-10 w-10 place-items-center rounded-full text-xs font-semibold"
            style={{
              color: riskColor[animal.risk],
              border: `1px solid ${riskColor[animal.risk]}55`,
            }}
          >
            {animal.riskScore}%
          </div>
        </div>
        
        {liveData && (
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-200 pt-3">
            <div className="text-center">
              <p className="text-[10px] uppercase text-milk-dim">Temp</p>
              <p className="text-xs font-medium text-milk">{liveData.temp != null ? `${Number(liveData.temp).toFixed(1)}°` : '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-milk-dim">EC</p>
              <p className="text-xs font-medium text-milk">{liveData.ec != null ? Number(liveData.ec).toFixed(1) : '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-milk-dim">pH</p>
              <p className="text-xs font-medium text-milk">{liveData.ph != null ? Number(liveData.ph).toFixed(1) : '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-milk-dim">Rum</p>
              <p className="text-xs font-medium text-milk">{liveData.rumination != null ? `${liveData.rumination}` : '—'}</p>
            </div>
          </div>
        )}

        <div className="mt-3">
          <RiskBadge risk={animal.risk} />
        </div>
      </Link>
    </InteractiveCard>
  );
}

const EMPTY_FORM = {
  species: 'cow',
  name: '',
  display_tag: '',
  rfid_tag: '',
  breed: '',
  age: '',
  lactation_number: '',
};

function ManualAnimalModal({ onClose, onAdd, existingTags, existingRfids }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    if (error) setError('');
  }

  function validateForm(nextForm) {
    const nextFieldErrors = {};
    const normalizedDisplayTag = nextForm.display_tag.trim();
    const normalizedName = nextForm.name.trim();
    const normalizedRfid = nextForm.rfid_tag.trim();
    const normalizedBreed = nextForm.breed.trim();
    const ageValue = Number(nextForm.age);
    const lactationValue = nextForm.lactation_number === '' ? null : Number(nextForm.lactation_number);

    if (!normalizedName) nextFieldErrors.name = 'Name is required.';
    else if (normalizedName.length < 2) nextFieldErrors.name = 'Name must be at least 2 characters.';

    if (!normalizedDisplayTag) nextFieldErrors.display_tag = 'Animal ID is required.';
    else if (!/^[A-Za-z][A-Za-z0-9-]{1,14}$/.test(normalizedDisplayTag)) nextFieldErrors.display_tag = 'Use a valid ID such as C-142 or B-305.';
    else if (existingTags.includes(normalizedDisplayTag.toLowerCase())) nextFieldErrors.display_tag = 'This animal ID is already in use.';

    if (!normalizedRfid) nextFieldErrors.rfid_tag = 'RFID / AIN tag is required.';
    else if (!/^[A-Za-z0-9]{8,15}$/.test(normalizedRfid)) nextFieldErrors.rfid_tag = 'RFID / AIN tag must be 8-15 alphanumeric characters.';
    else if (existingRfids.includes(normalizedRfid.toUpperCase())) nextFieldErrors.rfid_tag = 'This RFID tag is already assigned to another animal.';

    if (!normalizedBreed) nextFieldErrors.breed = 'Breed is required.';
    else if (normalizedBreed.length < 2) nextFieldErrors.breed = 'Breed must be at least 2 characters.';

    if (nextForm.age === '') nextFieldErrors.age = 'Age is required.';
    else if (!Number.isFinite(ageValue) || ageValue < 0 || ageValue > 30) nextFieldErrors.age = 'Age must be between 0 and 30 years.';

    if (nextForm.lactation_number !== '' && (!Number.isInteger(lactationValue) || lactationValue < 0 || lactationValue > 15)) {
      nextFieldErrors.lactation_number = 'Lactation number must be between 0 and 15.';
    }

    return nextFieldErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const validationErrors = validateForm(form);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      await onAdd({
        display_tag: form.display_tag.trim().toUpperCase(),
        rfid_tag: form.rfid_tag.trim().toUpperCase(),
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim(),
        age: Number(form.age) || 0,
        lactation_number: Number(form.lactation_number) || 0,
      });
    } catch (err) {
      setError(err.message || 'Could not register this animal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-animal-title"
        className="dashboard-modal"
        initial={{ opacity: 0, y: 18, scale: .97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-pasture">{t('newHerdRecord')}</p>
            <h2 id="manual-animal-title" className="mt-1 font-display text-2xl text-milk">{t('addAnimal')}</h2>
            <p className="mt-2 text-sm text-milk-dim">{t('enterAnimalProfile')}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close add animal dialog">
            <X size={18} />
          </button>
        </div>

        <form className="dashboard-animal-form" onSubmit={handleSubmit} noValidate>
          <label><span>{t('animalType')}</span><select name="species" value={form.species} onChange={updateField} aria-invalid={!!fieldErrors.species}><option value="cow">{t('cowLabel')}</option><option value="buffalo">{t('buffaloLabel')}</option></select>{fieldErrors.species && <small className="input-error-text">{fieldErrors.species}</small>}</label>
          <label><span>{t('name')}</span><input name="name" value={form.name} onChange={updateField} placeholder="e.g. Ganga" aria-invalid={!!fieldErrors.name} required />{fieldErrors.name && <small className="input-error-text">{fieldErrors.name}</small>}</label>
          <label><span>{t('animalId')}</span><input name="display_tag" value={form.display_tag} onChange={updateField} placeholder="e.g. C-142" aria-invalid={!!fieldErrors.display_tag} required />{fieldErrors.display_tag && <small className="input-error-text">{fieldErrors.display_tag}</small>}</label>
          <label><span>{t('rfidTagLabel')}</span><input name="rfid_tag" value={form.rfid_tag} onChange={updateField} placeholder="e.g. DG7A91K2" pattern="[A-Za-z0-9]{8,15}" maxLength="15" aria-invalid={!!fieldErrors.rfid_tag} required />{fieldErrors.rfid_tag && <small className="input-error-text">{fieldErrors.rfid_tag}</small>}</label>
          <label><span>{t('breed')}</span><input name="breed" value={form.breed} onChange={updateField} placeholder="e.g. Sahiwal Cross" aria-invalid={!!fieldErrors.breed} required />{fieldErrors.breed && <small className="input-error-text">{fieldErrors.breed}</small>}</label>
          <label><span>{t('age')}</span><input name="age" type="number" min="0" max="30" value={form.age} onChange={updateField} aria-invalid={!!fieldErrors.age} required />{fieldErrors.age && <small className="input-error-text">{fieldErrors.age}</small>}</label>
          <label><span>{t('lactationNumberLabel')}</span><input name="lactation_number" type="number" min="0" max="15" value={form.lactation_number} onChange={updateField} aria-invalid={!!fieldErrors.lactation_number} />{fieldErrors.lactation_number && <small className="input-error-text">{fieldErrors.lactation_number}</small>}</label>
          {error && <p className="dashboard-form-error" role="alert">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="dashboard-secondary-button" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="dashboard-primary-button" disabled={submitting}>
              <Plus size={16} /> {submitting ? t('saving') : t('addToHerd')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function HerdOverviewPage() {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: animals, loading, error, refetch } = useFetch(fetchHerd, []);
  const safeAnimals = Array.isArray(animals) ? animals : [];
  const hasMounted = useRef(false);
  useEffect(() => { hasMounted.current = true; }, []);

  const [liveData, setLiveData] = useState({});

  useEffect(() => {
    import('../../lib/socket.js').then(({ connectSocket }) => {
      const socket = connectSocket();
      
      const handleAnimalUpdate = () => refetch();
      
      const handleTelemetryNew = (payload) => {
        if (payload.readings && payload.readings.length > 0) {
          const firstReading = payload.readings[0];
          setLiveData(prev => ({
            ...prev,
            [firstReading.animal_id]: {
              temp: firstReading.skin_temp,
              ec: firstReading.ec,
              ph: firstReading.ph,
              rumination: firstReading.rumination,
            }
          }));
        } else if (payload.animal_id) {
          setLiveData(prev => ({
            ...prev,
            [payload.animal_id]: {
              temp: payload.skin_temp,
              ec: payload.ec,
              ph: payload.ph,
              rumination: payload.rumination,
            }
          }));
        }
        refetch();
      };

      socket.on('animal:updated', handleAnimalUpdate);
      socket.on('telemetry:new', handleTelemetryNew);
      return () => {
        socket.off('animal:updated', handleAnimalUpdate);
        socket.off('telemetry:new', handleTelemetryNew);
      };
    });
  }, [refetch]);

  async function addAnimal(payload) {
    await createAnimal(payload);
    setIsModalOpen(false);
    refetch();
  }

  const existingTags = safeAnimals.map((animal) => String(animal.displayTag || '').toLowerCase());
  const existingRfids = safeAnimals.map((animal) => String(animal.rfidTag || '').toUpperCase());

  if (loading) return <LoadingState label={t('loadingHerd')} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const highRisk = [...safeAnimals]
    .filter((a) => a.risk === 'High Risk' || a.risk === 'Moderate Risk')
    .sort((a, b) => b.riskScore - a.riskScore);
  const avgRisk = safeAnimals.length
    ? Math.round(safeAnimals.reduce((s, a) => s + (Number(a.riskScore) || 0), 0) / safeAnimals.length)
    : 0;

  return (
    <div className="space-y-10">
      <section className="dashboard-intro">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-pasture">{t('todayInHerd')}</p>
          <h1 className="mt-2 font-display text-3xl text-milk md:text-4xl">{t('earlierSignal')}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-milk-dim">
            {t('liveReadings')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="dashboard-primary-button" onClick={() => setIsModalOpen(true)}>
            <Plus size={17} /> {t('addAnimal')}
          </button>
          <div className="dashboard-intro-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
      <motion.div
        variants={cardGroupVariants}
        initial={hasMounted.current ? false : 'hidden'}
        animate="visible"
        className="dashboard-stat-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard label={t('herdSize')} value={safeAnimals.length} sub={t('acrossSpecies')} to="/dashboard/species/cow" />
        <StatCard
          label="High risk now"
          value={safeAnimals.filter((a) => a.risk === 'High Risk').length}
          sub={t('needsVet')}
          to="/dashboard/predictions"
        />
        <StatCard label={t('averageRiskScore')} value={`${avgRisk}%`} sub={t('herdWide')} to="/dashboard/analytics" />
        <StatCard label={t('gatewayUptime')} value="99.4%" sub={t('last30Days')} to="/dashboard/analytics" />
      </motion.div>

      {}
      <section className="dashboard-review-section rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-milk">{t('liveHerdReview')}</h2>
          <span className="text-xs text-milk-dim">{t('updatedMoments')}</span>
        </div>
        <motion.div
          variants={cardGroupVariants}
          initial={hasMounted.current ? false : 'hidden'}
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {safeAnimals.map((animal) => (
            <HerdCard key={animal.id} animal={animal} liveData={liveData[animal.id]} />
          ))}
        </motion.div>
      </section>

      {}
      <section className="dashboard-risk-section rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-milk">{t('highRiskBoard')}</h2>
          <span className="text-xs text-milk-dim">{highRisk.length} {t('animalsFlagged')}</span>
        </div>

        {highRisk.length === 0 ? (
          <p className="rounded-xl border border-milk/10 bg-night-card/60 p-6 text-sm text-milk-dim">
            {t('noRiskAnimals')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-milk/10">
            <table className="min-w-[680px] w-full text-left text-sm">
              <thead className="high-risk-table-head text-xs uppercase tracking-wide text-milk-dim">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('animal')}</th>
                  <th className="px-4 py-3 font-medium">{t('species')}</th>
                  <th className="px-4 py-3 font-medium">{t('risk')}</th>
                  <th className="px-4 py-3 font-medium">{t('score')}</th>
                  <th className="px-4 py-3 font-medium">{t('rumination')}</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {highRisk.map((a) => (
                  <tr key={a.id} className="border-t border-milk/10 hover:bg-milk/5">
                    <td className="px-4 py-3 font-display text-milk">
                      {a.name} <span className="text-milk-dim">· {a.displayTag}</span>
                    </td>
                    <td className="px-4 py-3 capitalize text-milk-dim">{a.species}</td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={a.risk} />
                    </td>
                    <td className="px-4 py-3 text-milk">{a.riskScore}%</td>
                    <td className="px-4 py-3 text-milk-dim">{a.rumination}%</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/dashboard/species/${a.species}/${a.id}`}
                        className="focus-ring text-xs font-medium text-sky-600 transition-colors hover:text-sky-700"
                      >
                        {t('view')} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <AnimatePresence>
        {isModalOpen && (
          <ManualAnimalModal
            onClose={() => setIsModalOpen(false)}
            onAdd={addAnimal}
            existingTags={existingTags}
            existingRfids={existingRfids}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
