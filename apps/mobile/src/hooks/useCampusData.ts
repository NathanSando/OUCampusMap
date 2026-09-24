import { useQuery } from '@tanstack/react-query';

import {
  fetchAccessibility,
  fetchActiveReports,
  fetchBuildings,
  fetchDining,
  fetchPrinters,
} from '@/lib/data';

// Reference data changes rarely — cache for 10 minutes.
const REFERENCE = { staleTime: 10 * 60 * 1000 };

export const queryKeys = {
  buildings: ['buildings'] as const,
  dining: ['dining'] as const,
  printers: ['printers'] as const,
  accessibility: ['accessibility'] as const,
  reports: ['reports', 'active'] as const,
};

export const useBuildings = () =>
  useQuery({ queryKey: queryKeys.buildings, queryFn: fetchBuildings, ...REFERENCE });
export const useDining = () =>
  useQuery({ queryKey: queryKeys.dining, queryFn: fetchDining, ...REFERENCE });
export const usePrinters = () =>
  useQuery({ queryKey: queryKeys.printers, queryFn: fetchPrinters, ...REFERENCE });
export const useAccessibility = () =>
  useQuery({ queryKey: queryKeys.accessibility, queryFn: fetchAccessibility, ...REFERENCE });

/** Kept fresh by Realtime (useReportsRealtime); the interval is a backstop for expiry. */
export const useActiveReports = () =>
  useQuery({ queryKey: queryKeys.reports, queryFn: fetchActiveReports, refetchInterval: 60_000 });

export function useBuilding(id: string | undefined) {
  const query = useBuildings();
  return { ...query, data: query.data?.find((b) => b.id === id) };
}
