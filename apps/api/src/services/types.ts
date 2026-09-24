import type {
  ChatMessage,
  ChatResponse,
  LatLng,
  Report,
  ReportCategory,
  VoteResponse,
} from '@ou-campus-map/shared-types';

export interface AuthUser {
  id: string;
}

export interface AuthVerifier {
  /** Returns the user for a valid Supabase access token, or null. */
  verifyToken(token: string): Promise<AuthUser | null>;
}

export interface NewReport {
  userId: string;
  category: ReportCategory;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  buildingId: string | null;
  expiresAt: Date;
}

export interface ReportStore {
  insert(report: NewReport): Promise<Report>;
  /** Returns null if the report doesn't exist or is no longer active. */
  castVote(reportId: string, userId: string, vote: 1 | -1): Promise<VoteResponse | null>;
  getOwner(reportId: string): Promise<{ userId: string; status: Report['status'] } | null>;
  softDelete(reportId: string): Promise<void>;
  nearestBuildingId(point: LatLng, maxMeters: number): Promise<string | null>;
}

export interface Classification {
  suggestedCategory: ReportCategory;
  isSpam: boolean;
  confidence: number;
  reason: string;
}

export interface AiClient {
  /** Resolves null when the AI service is unreachable or slow — callers must degrade gracefully. */
  classifyReport(input: {
    title: string;
    description?: string;
    userCategory: ReportCategory;
  }): Promise<Classification | null>;
  chat(input: {
    message: string;
    history: ChatMessage[];
    userLocation?: LatLng;
  }): Promise<ChatResponse>;
  isHealthy(): Promise<boolean>;
}

export interface Deps {
  auth: AuthVerifier;
  reports: ReportStore;
  ai: AiClient;
  corsOrigins?: string[];
}
