import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { LAYER_KEYS, type LayerKey } from '@/constants/categories';

const STORAGE_KEY = 'map.layers.v1';
const DEFAULT: Record<LayerKey, boolean> = {
  buildings: true,
  dining: true,
  printers: true,
  accessibility: true,
  reports: true,
};

/** Layer toggles, persisted locally (design doc §9.2). */
export function useLayerPrefs() {
  const [layers, setLayers] = useState(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Record<LayerKey, boolean>>;
        setLayers((prev) => {
          const next = { ...prev };
          for (const k of LAYER_KEYS) if (typeof saved[k] === 'boolean') next[k] = saved[k]!;
          return next;
        });
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback((key: LayerKey) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { layers, toggle };
}
