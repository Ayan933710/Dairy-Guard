/** Resource-specific calls for herd/animal/prediction/history/analytics endpoints. */
import { api } from './apiClient.js';
import {
  normalizeAnimal,
  normalizeQuarter,
  normalizeTrendPoint,
  normalizePrediction,
  normalizeRecommendation,
  normalizeHistoryEvent,
} from './normalize.js';

export async function fetchHerd() {
  const { herd } = await api.get('/herd');
  return herd.map(normalizeAnimal);
}

export async function fetchHerdBySpecies(species) {
  const { herd } = await api.get(`/herd/species/${species}`);
  return herd.map(normalizeAnimal);
}

export async function createAnimal({ display_tag, rfid_tag, name, species, breed, age, lactation_number }) {
  const { animal } = await api.post('/herd', { display_tag, rfid_tag, name, species, breed, age, lactation_number });
  return normalizeAnimal(animal);
}

export async function fetchAnimalDetail(animalId) {
  const { animal, quarters, trend, latestPrediction, latestTelemetry } = await api.get(`/animals/${animalId}`);
  return {
    animal: normalizeAnimal(animal),
    quarters: (quarters || []).map(normalizeQuarter).filter(Boolean),
    trend: (trend || []).map(normalizeTrendPoint),
    latestPrediction: normalizePrediction(latestPrediction),
    latestTelemetry,
  };
}

export async function fetchRecommendations() {
  const { recommendations } = await api.get('/predictions');
  return recommendations.map(normalizeRecommendation);
}

export async function runPrediction(animalId) {
  const { animal, risk } = await api.post(`/predictions/run/${animalId}`, {});
  return { animal: normalizeAnimal(animal), risk };
}

export async function removeAnimal(animalId) {
  const { animal } = await api.del(`/animals/${animalId}`);
  return normalizeAnimal(animal);
}

export async function fetchHistory() {
  const { events } = await api.get('/history');
  return events.map(normalizeHistoryEvent);
}

export async function fetchAnalyticsSummary() {
  return api.get('/analytics/summary'); // { riskBreakdown, speciesBreakdown, herdAvgTrend }
}
