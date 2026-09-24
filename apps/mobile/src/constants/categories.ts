/**
 * Report categories and map layers — colors, icons and labels defined once and used
 * everywhere (design doc §9.3). Hues must not be changed: they're chosen to stay
 * distinguishable under common color-blindness (docs/color-palette.md).
 */
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  REPORT_CATEGORIES,
  REPORT_TTL_MS,
  type AccessibilityFeatureType,
  type ReportCategory,
} from '@ou-campus-map/shared-types';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface CategoryMeta {
  label: string;
  color: string;
  icon: IconName;
}

export const REPORT_CATEGORY_META: Record<ReportCategory, CategoryMeta> = {
  elevator_outage: {
    label: 'Elevator outage',
    color: '#F2A93B',
    icon: 'elevator-passenger-off-outline',
  },
  construction: { label: 'Construction', color: '#FF8C42', icon: 'hard-hat' },
  event: { label: 'Event / crowd', color: '#9B87E0', icon: 'party-popper' },
  hazard: { label: 'Hazard', color: '#EF4B4B', icon: 'alert' },
  closure: { label: 'Closure', color: '#7C8B9A', icon: 'cancel' },
  other: { label: 'Other', color: '#4FC3D9', icon: 'message-text-outline' },
};

export const REPORT_CATEGORY_LIST = REPORT_CATEGORIES.map((key) => ({
  key,
  ...REPORT_CATEGORY_META[key],
}));

export function formatTtl(category: ReportCategory): string {
  const hours = REPORT_TTL_MS[category] / 3_600_000;
  return hours % 24 === 0 && hours >= 48 ? `${hours / 24} days` : `${hours} hours`;
}

export type LayerKey = 'buildings' | 'dining' | 'printers' | 'accessibility' | 'reports';

export const LAYER_META: Record<LayerKey, CategoryMeta> = {
  buildings: { label: 'Buildings', color: '#8FA3B0', icon: 'office-building-outline' },
  dining: { label: 'Dining', color: '#FF9F5A', icon: 'silverware-fork-knife' },
  printers: { label: 'Printers', color: '#5AA9E6', icon: 'printer-outline' },
  accessibility: { label: 'Accessibility', color: '#4ECB71', icon: 'wheelchair-accessibility' },
  reports: { label: 'Reports', color: '#D6293C', icon: 'alert-outline' },
};

export const LAYER_KEYS = Object.keys(LAYER_META) as LayerKey[];

export const ACCESSIBILITY_FEATURE_META: Record<
  AccessibilityFeatureType,
  { label: string; icon: IconName }
> = {
  accessible_entrance: { label: 'Accessible entrance', icon: 'door-open' },
  ramp: { label: 'Ramp', icon: 'slope-uphill' },
  elevator: { label: 'Elevator', icon: 'elevator-passenger-outline' },
  accessible_restroom: { label: 'Accessible restroom', icon: 'human-wheelchair' },
  automatic_door: { label: 'Automatic door', icon: 'door-sliding' },
  braille_signage: { label: 'Braille signage', icon: 'braille' },
};
