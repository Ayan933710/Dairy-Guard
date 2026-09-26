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
