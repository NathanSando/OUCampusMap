import { formatDistance, formatDuration, isNearPath, relativeTime } from '../geo';

describe('geo helpers', () => {
  const path = [
    { lat: 35.2045, lng: -97.4449 }, // Gaylord Hall
    { lat: 35.208, lng: -97.4459 }, // Bizzell
  ];

  it('detects a report on the route', () => {
    // Midpoint of the segment, nudged ~5 m east.
    expect(isNearPath({ lat: 35.20625, lng: -97.44535 }, path, 30)).toBe(true);
  });

  it('ignores reports far from the route', () => {
    expect(isNearPath({ lat: 35.2107, lng: -97.4418 }, path, 30)).toBe(false); // Devon
  });

  it('formats distances and durations', () => {
    expect(formatDistance(100)).toBe('328 ft');
    expect(formatDistance(1609.34)).toBe('1.0 mi');
    expect(formatDuration(30)).toBe('1 min');
    expect(formatDuration(600)).toBe('10 min');
  });

  it('formats relative times', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    expect(relativeTime('2026-09-24T11:58:00Z', now)).toBe('2 min ago');
    expect(relativeTime('2026-09-24T09:00:00Z', now)).toBe('3 h ago');
  });
});
