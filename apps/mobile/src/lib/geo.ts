import { distanceMeters, type LatLng } from '@ou-campus-map/shared-types';

export { distanceMeters };

/** Average walking pace used for estimates (~3 mph). Mapbox gives real durations when available. */
export const WALK_METERS_PER_MIN = 80;

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters * 3.281)} ft`;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export function estimateWalkSeconds(meters: number): number {
  return (meters / WALK_METERS_PER_MIN) * 60;
}

/** Distance from point p to segment a–b, in meters (equirectangular approximation — fine at campus scale). */
export function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lng - p.lng) * mPerDegLng;
  const ay = (a.lat - p.lat) * mPerDegLat;
  const bx = (b.lng - p.lng) * mPerDegLng;
  const by = (b.lat - p.lat) * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** True when `point` lies within `radiusMeters` of any segment of `path`. */
export function isNearPath(point: LatLng, path: LatLng[], radiusMeters: number): boolean {
  if (path.length === 1) return distanceMeters(point, path[0]!) <= radiusMeters;
  for (let i = 1; i < path.length; i++) {
    if (pointToSegmentMeters(point, path[i - 1]!, path[i]!) <= radiusMeters) return true;
  }
  return false;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const secs = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function timeUntil(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - now.getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
}
