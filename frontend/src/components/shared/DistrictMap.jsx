import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function DistrictMap({ center = [22.5726, 88.3639], markers = [], onSelect }) {
  const mapNode = useRef(null);

  useEffect(() => {
    if (!mapNode.current) return undefined;

    const map = L.map(mapNode.current, { scrollWheelZoom: true }).setView(center, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markerLayers = markers.map((marker) => {
      const circle = L.circleMarker(marker.position, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: marker.color || '#dc2626',
        fillOpacity: 0.95,
      });
      const popup = `<strong>${escapeHtml(marker.label)}</strong>${marker.detail ? `<br />${escapeHtml(marker.detail)}` : ''}`;
      circle.bindPopup(popup);
      circle.on('click', () => onSelect?.(marker.data));
      circle.addTo(map);
      return circle;
    });

    if (markers.length > 1) {
      map.fitBounds(L.featureGroup(markerLayers).getBounds(), { padding: [28, 28], maxZoom: 12 });
    } else {
      map.setView(center, 10);
    }

    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(resizeTimer);
      markerLayers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [center, markers, onSelect]);

  return (
    <div className="relative min-h-[25rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div ref={mapNode} className="absolute inset-0 h-full w-full" />
    </div>
  );
}