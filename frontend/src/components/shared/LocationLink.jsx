import { MapPin } from 'lucide-react';

export default function LocationLink({ latitude, longitude, className = '' }) {
  if (latitude == null || longitude == null) return <span className={className}>Location unavailable</span>;

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return <span className={className}>Location unavailable</span>;
  }

  const href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return (
    <a className={`inline-flex items-center gap-1 text-sky-700 underline-offset-2 hover:underline ${className}`} href={href} target="_blank" rel="noreferrer">
      <MapPin size={14} className="shrink-0" />
      <span>Get Location</span>
    </a>
  );
}
