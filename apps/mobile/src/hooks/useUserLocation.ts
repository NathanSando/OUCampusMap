import type { LatLng } from '@ou-campus-map/shared-types';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type PermissionState = 'unknown' | 'granted' | 'denied';

/**
 * Current position, if the user allows it. Everything degrades gracefully when denied:
 * the map still works; "locate me" and distances don't (design doc §9.3).
 */
export function useUserLocation({ request = false }: { request?: boolean } = {}) {
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [location, setLocation] = useState<LatLng | null>(null);

  const refresh = useCallback(async (): Promise<LatLng | null> => {
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    if (status !== 'granted' && current.canAskAgain) {
      status = (await Location.requestForegroundPermissionsAsync()).status;
    }
    if (status !== 'granted') {
      setPermission('denied');
      return null;
    }
    setPermission('granted');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === 'granted' || request) {
        const first = await refresh();
        if (!first || cancelled) return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 15 },
          (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        );
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [refresh, request]);

  return { location, permission, refresh };
}
