import type { ReportCategory } from './enums';
import type { LatLng } from './campus';
import type { PlaceType, Report } from './models';

/* Request/response contracts for the Node API (design doc §7). */

export interface CreateReportRequest {
  category: ReportCategory;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  /** Optional; when omitted the API associates the nearest building. */
  buildingId?: string;
}

export interface CreateReportResponse {
  report: Report;
  /** Set when the AI classifier re-categorised the report. */
  categoryChangedFrom?: ReportCategory;
}

export interface VoteRequest {
  vote: 1 | -1;
}

export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  status: Report['status'];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  userLocation?: LatLng;
}

export interface ReferencedPlace {
  type: PlaceType;
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface ChatResponse {
  reply: string;
  referencedPlaces: ReferencedPlace[];
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  aiService: 'up' | 'down';
}

export const API_ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'AI_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Every API error uses this shape (design doc §7.4). */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
