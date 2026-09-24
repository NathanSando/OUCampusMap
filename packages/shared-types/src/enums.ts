// Mirrors the Postgres enums in supabase/migrations/0001_init.sql (design doc §6.1).
// Keep these lists in sync with the migration.

export const REPORT_CATEGORIES = [
  'elevator_outage',
  'construction',
  'event',
  'hazard',
  'closure',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const ACCESSIBILITY_FEATURE_TYPES = [
  'accessible_entrance',
  'ramp',
  'elevator',
  'accessible_restroom',
  'automatic_door',
  'braille_signage',
] as const;
export type AccessibilityFeatureType = (typeof ACCESSIBILITY_FEATURE_TYPES)[number];

export const REPORT_STATUSES = ['active', 'expired', 'removed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

const HOUR_MS = 60 * 60 * 1000;

/** Default time-to-live per report category (design doc §6.3). */
export const REPORT_TTL_MS: Record<ReportCategory, number> = {
  elevator_outage: 24 * HOUR_MS,
  construction: 7 * 24 * HOUR_MS,
  event: 12 * HOUR_MS,
  hazard: 12 * HOUR_MS,
  closure: 24 * HOUR_MS,
  other: 12 * HOUR_MS,
};

/** Reports at or below this net score (upvotes − downvotes) are auto-hidden. */
export const REPORT_AUTO_HIDE_NET_SCORE = -5;

export function computeReportExpiry(category: ReportCategory, createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + REPORT_TTL_MS[category]);
}
