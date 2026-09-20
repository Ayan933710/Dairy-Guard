/**
 * Opens Google Maps in a new tab, centered on the user's current location
 * (via the browser Geolocation API) with a "veterinarian" search — so a
 * recommendation card can send the farmer straight to nearby vets without
 * NANDI needing to maintain its own directory of clinics.
 *
 * Falls back to a location-less Maps search if geolocation is denied,
 * unavailable, or times out.
 */
const FALLBACK_URL = 'https://www.google.com/maps/search/veterinarian+near+me';

export function openNearbyVetSearch() {
  if (!('geolocation' in navigator)) {
    window.open(FALLBACK_URL, '_blank', 'noopener,noreferrer');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const url = `https://www.google.com/maps/search/veterinarian/@${latitude},${longitude},13z`;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    () => {
      window.open(FALLBACK_URL, '_blank', 'noopener,noreferrer');
    },
    { timeout: 5000 }
  );
}
