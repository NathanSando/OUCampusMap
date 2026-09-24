import type { AccessibilityFeatureType, ReportCategory, ReportStatus } from './enums';
import type { WeeklyHours } from './hours';

/*
 * Row shapes as returned by the read views in supabase/migrations/0002_read_views.sql.
 * The views expose `lat`/`lng` numbers instead of raw PostGIS geography, which
 * PostgREST would otherwise return as hex-encoded WKB.
 */

export interface Building {
  id: string;
  name: string;
  abbreviation: string | null;
  aliases: string[];
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  hours: WeeklyHours | null;
  image_url: string | null;
}

export interface AccessibilityFeature {
  id: string;
  building_id: string;
  feature_type: AccessibilityFeatureType;
  description: string | null;
  floor: string | null;
  /** Null when the feature applies to the whole building. */
  lat: number | null;
  lng: number | null;
  /** Date a team member confirmed the feature in person; null = unverified. */
  verified_at: string | null;
}

export interface DiningLocation {
  id: string;
  name: string;
  building_id: string | null;
  lat: number;
  lng: number;
  hours: WeeklyHours | null;
  cuisine_type: string | null;
  /** Null = unknown. */
  accepts_meal_plan: boolean | null;
  menu_url: string | null;
}

export interface Printer {
  id: string;
  label: string;
  building_id: string | null;
  floor_note: string | null;
  lat: number;
  lng: number;
  notes: string | null;
}

/** Tier 2 — schema exists, UI not built yet. */
export interface StudySpace {
  id: string;
  building_id: string;
  name: string;
  room: string | null;
  capacity: number | null;
  reservable: boolean;
  booking_url: string | null;
  hours: WeeklyHours | null;
}

export interface Report {
  id: string;
  user_id: string;
  category: ReportCategory;
  title: string;
  description: string | null;
  building_id: string | null;
  lat: number;
  lng: number;
  status: ReportStatus;
  upvotes: number;
  downvotes: number;
  created_at: string;
  expires_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export type PlaceType = 'building' | 'dining' | 'printer' | 'accessibility' | 'report';
