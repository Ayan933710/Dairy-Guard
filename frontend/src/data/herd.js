/**
 * Shared constants used across the dashboard UI (colors, enumerations).
 *
 * NOTE: this file used to also export mock HERD / RECOMMENDATIONS /
 * HISTORY_LOG arrays for local prototyping. All dashboard pages now fetch
 * real data from the DairyGuard AI backend (see src/lib/herdApi.js) - this
 * file only keeps the small set of UI constants that are still shared
 * across components (risk badge colors, the risk level enum, species list).
 */

export const SPECIES = ['cow', 'buffalo'];

export const RISK_LEVELS = ['No Risk', 'Low Risk', 'Moderate Risk', 'High Risk'];

export const riskColor = {
  'No Risk': '#22C55E',
  'Low Risk': '#38BDF8',
  'Moderate Risk': '#F59E0B',
  'High Risk': '#EF4444',
};
