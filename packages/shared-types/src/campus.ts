/**
 * Norman campus geography. Bounds come from the OpenStreetMap campus boundary
 * (way 392003756: 35.1794–35.2129 N, 97.4311–97.4539 W) with a small margin,
 * and cover the main campus, south campus and the research campus.
 * Health Sciences Center (OKC) and Tulsa are out of scope (design doc §1).
 */
export interface LatLng {
  lat: number;
  lng: number;
}

export const CAMPUS_BOUNDS = {
  north: 35.2175,
  south: 35.1765,
  east: -97.4255,
  west: -97.4615,
} as const;

/** Default camera: centred between the North and South Ovals. */
export const CAMPUS_CENTER: LatLng = { lat: 35.2055, lng: -97.4445 };

export function isWithinCampus({ lat, lng }: LatLng): boolean {
  return (
    lat <= CAMPUS_BOUNDS.north &&
    lat >= CAMPUS_BOUNDS.south &&
    lng <= CAMPUS_BOUNDS.east &&
    lng >= CAMPUS_BOUNDS.west
  );
}

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
