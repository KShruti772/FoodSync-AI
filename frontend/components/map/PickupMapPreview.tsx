'use client';

import React from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  Compass,
} from 'lucide-react';

interface PickupMapPreviewProps {
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress: string;
  isUnlocked: boolean;
  distanceKm?: number;
  recipientLat?: number;
  recipientLng?: number;
  recipientName?: string;
  approxAreaText?: string;
}

export default function PickupMapPreview({
  pickupLat,
  pickupLng,
  pickupAddress,
  isUnlocked,
  distanceKm,
  recipientLat,
  recipientLng,
  recipientName = 'Your Facility',
  approxAreaText = 'Solapur District',
}: PickupMapPreviewProps) {
  const hasCoordinates =
    typeof pickupLat === 'number' &&
    typeof pickupLng === 'number' &&
    !isNaN(pickupLat) &&
    !isNaN(pickupLng) &&
    pickupLat !== 0 &&
    pickupLng !== 0;

  // Masked State (PROPOSED Opportunity): Privacy safeguard active
  if (!isUnlocked) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <Lock className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Pickup Location Safeguard (Privacy Protected)</h3>
          </div>
          <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
            Area Masked
          </span>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center space-y-2">
          <div className="h-10 w-10 mx-auto rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            Approximate Vicinity: {approxAreaText} (~{distanceKm ? `${distanceKm} km radius` : '2 km radius'})
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
            Exact street address, pin coordinates, and turn-by-turn routing unlock automatically once you accept this match.
          </p>
        </div>
      </div>
    );
  }

  // Unlocked State without valid coordinates: Graceful fallback
  if (!hasCoordinates) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
            <MapPin className="h-4 w-4 text-emerald-700" />
            <span>Pickup Address (Coordinates Unavailable)</span>
          </div>
          <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
            Unlocked
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs text-slate-800 space-y-1">
          <p className="font-bold">{pickupAddress}</p>
          <p className="text-[11px] text-slate-500">
            Donor did not specify GPS coordinates for this listing. Please follow the physical address instructions above.
          </p>
        </div>
      </div>
    );
  }

  // Unlocked State with valid coordinates: Interactive OpenStreetMap embed & directions
  const delta = 0.008;
  const bbox = `${pickupLng! - delta},${pickupLat! - delta},${pickupLng! + delta},${pickupLat! + delta}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${pickupLat},${pickupLng}`)}`;

  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${pickupLat}&mlon=${pickupLng}#map=16/${pickupLat}/${pickupLng}`;

  // Routing link: if recipient coordinates are known, link directly to routing
  const hasRecipientCoords =
    typeof recipientLat === 'number' &&
    typeof recipientLng === 'number' &&
    !isNaN(recipientLat) &&
    !isNaN(recipientLng);

  const routeUrl = hasRecipientCoords
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${recipientLat}%2C${recipientLng}%3B${pickupLat}%2C${pickupLng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`;

  const estimatedMins = distanceKm ? Math.max(2, Math.round(distanceKm * 2.5)) : 5;

  return (
    <div className="rounded-2xl border border-emerald-300 bg-white overflow-hidden shadow-2xs space-y-0">
      {/* Map Header */}
      <div className="p-4 bg-emerald-50/60 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Unlock className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Pickup Location & Route Map Preview</h3>
            <p className="text-[11px] text-slate-500">
              Donor coordinates: {pickupLat!.toFixed(4)}, {pickupLng!.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {distanceKm !== undefined && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
              <Compass className="h-3.5 w-3.5" />
              {distanceKm} km away (~{estimatedMins} min drive)
            </span>
          )}
        </div>
      </div>

      {/* Embedded OpenStreetMap Preview */}
      <div className="relative w-full h-56 sm:h-64 bg-slate-100">
        <iframe
          title="Pickup Location Map Preview"
          src={osmEmbedUrl}
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>

      {/* Route & Directions Footer */}
      <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-md">{pickupAddress}</span>
          </p>
          {hasRecipientCoords && (
            <p className="text-[11px] text-slate-500 pl-5">
              Route mapped from <strong>{recipientName}</strong> ({recipientLat!.toFixed(4)}, {recipientLng!.toFixed(4)})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={routeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-2xs transition-colors"
          >
            <Navigation className="h-3.5 w-3.5" />
            Get Turn-by-Turn Route
          </a>

          <a
            href={osmDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            title="Open in OpenStreetMap"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Full Map
          </a>
        </div>
      </div>
    </div>
  );
}
