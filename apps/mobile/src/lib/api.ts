import type {
  ApiErrorBody,
  ApiErrorCode,
  ChatRequest,
  ChatResponse,
  CreateReportRequest,
  CreateReportResponse,
  VoteResponse,
} from '@ou-campus-map/shared-types';

import { config, hasApi } from '@/constants/config';
import { supabase } from './supabase';

/** Node API client — used only for writes and the assistant (design doc §4). */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode | 'NETWORK' | 'NOT_CONFIGURED',
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!hasApi) {
    throw new ApiError(
      'NOT_CONFIGURED',
      'The app server isn’t configured (EXPO_PUBLIC_API_BASE_URL).',
    );
  }
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'NETWORK',
      'Couldn’t reach the server. Check your connection and try again.',
    );
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? 'INTERNAL_ERROR', err?.message ?? 'Something went wrong.');
  }
  return json as T;
}

export const api = {
  createReport: (body: CreateReportRequest) =>
    request<CreateReportResponse>('POST', '/reports', body),
  vote: (reportId: string, vote: 1 | -1) =>
    request<VoteResponse>('POST', `/reports/${reportId}/vote`, { vote }),
  deleteReport: (reportId: string) => request<void>('DELETE', `/reports/${reportId}`),
  chat: (body: ChatRequest) => request<ChatResponse>('POST', '/assistant/chat', body),
};
