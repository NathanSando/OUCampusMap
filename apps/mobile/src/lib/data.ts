import type {
  AccessibilityFeature,
  Building,
  DiningLocation,
  Printer,
  Report,
} from '@ou-campus-map/shared-types';

import { isDemoMode } from '@/constants/config';
import seed from '@/data/seed.generated.json';
import { supabase } from './supabase';

/*
 * Read layer. All reference-data reads go directly to Supabase through the v_* views
 * (design doc §4, §7.1 — no REST endpoints for reads). In demo mode (no Supabase
 * configured) the same functions return the bundled seed data so the map still works.
 */

async function fromView<T>(view: string, order?: string): Promise<T[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  let query = supabase.from(view).select('*');
  if (order) query = query.order(order);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export function fetchBuildings(): Promise<Building[]> {
  if (isDemoMode) return Promise.resolve(seed.buildings as Building[]);
  return fromView<Building>('v_buildings', 'name');
}

export function fetchDining(): Promise<DiningLocation[]> {
  if (isDemoMode) return Promise.resolve(seed.dining as DiningLocation[]);
  return fromView<DiningLocation>('v_dining_locations', 'name');
}

export function fetchPrinters(): Promise<Printer[]> {
  if (isDemoMode) return Promise.resolve(seed.printers as Printer[]);
  return fromView<Printer>('v_printers', 'label');
}

export function fetchAccessibility(): Promise<AccessibilityFeature[]> {
  if (isDemoMode) return Promise.resolve(seed.accessibility as AccessibilityFeature[]);
  return fromView<AccessibilityFeature>('v_accessibility_features');
}

/** Active, unexpired reports, newest first. The view applies the expiry filter. */
export async function fetchActiveReports(): Promise<Report[]> {
  if (isDemoMode || !supabase) return [];
  const { data, error } = await supabase
    .from('v_active_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Report[];
}
