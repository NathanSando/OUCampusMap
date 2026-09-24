import type { LatLng } from '@ou-campus-map/shared-types';

import { config, hasMapbox } from '@/constants/config';
import { distanceMeters, estimateWalkSeconds } from './geo';

export interface WalkingRoute {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  /** False when Mapbox was unavailable and we fell back to a straight-line estimate. */
  routed: boolean;
}

/**
 * Walking directions via the Mapbox Directions API, called directly from the app with a
 * public, URL-restricted pk.* token (design doc §4 — do not proxy through the Node API).
 */
export async function getWalkingRoute(from: LatLng, to: LatLng): Promise<WalkingRoute> {
  if (!hasMapbox) return straightLine(from, to);

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}` +
    `?geometries=geojson&overview=full&access_token=${encodeURIComponent(config.mapboxToken)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Directions request failed (${res.status}).`);
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) throw new Error('No walking route found between those points.');

  return {
    coordinates: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({
      lat,
      lng,
    })),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    routed: true,
  };
}

/** Offline/no-token fallback. The UI labels this as an estimate, never as a route. */
function straightLine(from: LatLng, to: LatLng): WalkingRoute {
  // Campus paths are rarely straight; 1.3× is a common detour factor for pedestrian networks.
  const meters = distanceMeters(from, to) * 1.3;
  return {
    coordinates: [from, to],
    distanceMeters: meters,
    durationSeconds: estimateWalkSeconds(meters),
    routed: false,
  };
}
