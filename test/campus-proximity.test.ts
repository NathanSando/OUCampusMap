import {
  estimateWalkSeconds,
  formatDuration,
  getCampusNodeProximity,
  MAX_CAMPUS_NODE_DISTANCE_M,
} from '../apps/mobile/src/lib/geo';

describe('Campus location, nearest-node distance, and walking time', () => {
  const gaylord = { name: 'Gaylord Hall', lat: 35.2045, lng: -97.4449 };
  const bizzell = { name: 'Bizzell Memorial Library', lat: 35.208, lng: -97.4459 };
  const location = { lat: 35.205, lng: -97.4449 };

  it('accepts a user within 100 meters of the nearest campus node and estimates walking time', () => {
    // Put the farther node first to verify that the closest node is selected.
    const result = getCampusNodeProximity(location, [bizzell, gaylord]);

    expect(MAX_CAMPUS_NODE_DISTANCE_M).toBe(100);
    expect(result.nearestNode).toBe(gaylord);
    expect(result.isOnCampus).toBe(true);
    // A latitude difference of 0.0005 degrees is about 55.6 meters.
    expect(result.distanceMeters).toBeCloseTo(55.6, 1);
    expect(result.distanceMeters).toBeLessThanOrEqual(100);
    const seconds = estimateWalkSeconds(result.distanceMeters!);
    // The existing estimator uses an 80 meters/minute walking pace.
    expect(seconds).toBeCloseTo(41.7, 1);
    expect(formatDuration(seconds)).toBe('1 min');
  });

  it('rejects a user inside campus but over 100 meters from the nearest node', () => {
    const result = getCampusNodeProximity({ lat: 35.206, lng: -97.4449 }, [gaylord]);
    expect(result.nearestNode).toBe(gaylord);
    expect(result.distanceMeters).toBeGreaterThan(100);
    expect(result.isOnCampus).toBe(false);
  });

  it('rejects a user outside campus even when a node is nearby', () => {
    const outside = { lat: 35.22, lng: -97.4449 };
    const result = getCampusNodeProximity(outside, [{ name: 'Outside node', ...outside }]);
    expect(result.distanceMeters).toBe(0);
    expect(result.isOnCampus).toBe(false);
  });

  it('includes the distance limit and rejects a distance just beyond it', () => {
    const distance = getCampusNodeProximity(location, [gaylord]).distanceMeters!;
    expect(getCampusNodeProximity(location, [gaylord], distance).isOnCampus).toBe(true);
    expect(getCampusNodeProximity(location, [gaylord], distance - 0.01).isOnCampus).toBe(false);
  });

  it('rejects a location when no map nodes are available', () => {
    expect(getCampusNodeProximity(location, [])).toEqual({
      nearestNode: null,
      distanceMeters: null,
      isOnCampus: false,
    });
  });
});
