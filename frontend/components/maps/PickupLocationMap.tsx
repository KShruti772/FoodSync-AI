'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { getValidPickupCoordinates } from '@/lib/pickup-location.mjs';

interface PickupLocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
}

export default function PickupLocationMap({
  latitude,
  longitude,
}: PickupLocationMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const coordinates = useMemo(
    () => getValidPickupCoordinates(latitude, longitude),
    [latitude, longitude],
  );

  useEffect(() => {
    if (!coordinates || !mapElement.current) return;

    let cancelled = false;
    let map: LeafletMap | null = null;
    setMapError(null);

    import('leaflet')
      .then(({ default: L }) => {
        if (cancelled || !mapElement.current) return;

        map = L.map(mapElement.current).setView(coordinates, 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
          .on('tileerror', () => {
            setMapError('Map tiles could not be loaded. Check your internet connection.');
          })
          .addTo(map);
        L.marker(coordinates, {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:20px;height:20px;background:#059669;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 5px rgba(15,23,42,.45)"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
          .addTo(map)
          .bindPopup('Food pickup location');
      })
      .catch(() => {
        if (!cancelled) setMapError('The pickup map could not be loaded.');
      });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [coordinates]);

  if (!coordinates) {
    const hasCoordinates = latitude != null || longitude != null;
    return (
      <p
        role={hasCoordinates ? 'alert' : 'status'}
        className={`rounded-xl border p-4 text-sm ${
          hasCoordinates
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        {hasCoordinates
          ? 'Pickup coordinates are invalid. Latitude must be between -90 and 90 and longitude between -180 and 180.'
          : 'Pickup location not available.'}
      </p>
    );
  }

  return (
    <div>
      {mapError && (
        <p role="alert" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {mapError}
        </p>
      )}
      <div
        ref={mapElement}
        aria-label="Interactive map showing the food pickup location"
        className="h-72 w-full overflow-hidden rounded-xl border border-slate-200 sm:h-80"
      />
      <p className="mt-2 text-xs text-slate-500">
        Use the map controls or drag to zoom and pan. Map tiles require an internet connection.
      </p>
    </div>
  );
}
