import { REPORT_CATEGORIES, type ChatResponse } from '@ou-campus-map/shared-types';
import { z } from 'zod';
import { ApiError } from '../errors';
import type { AiClient, Classification } from './types';

/** Classification must never hold up report creation for long (design doc §8.2). */
export const CLASSIFY_TIMEOUT_MS = 2000;
const CHAT_TIMEOUT_MS = 20_000;
const HEALTH_TIMEOUT_MS = 1500;

const ClassificationSchema = z.object({
  suggestedCategory: z.enum(REPORT_CATEGORIES),
  isSpam: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const ChatResponseSchema = z.object({
  reply: z.string(),
  referencedPlaces: z.array(
    z.object({
      type: z.enum(['building', 'dining', 'printer', 'accessibility', 'report']),
      id: z.string(),
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
    }),
  ),
});

export function httpAiClient(baseUrl: string, sharedSecret: string): AiClient {
  const post = (path: string, body: unknown, timeoutMs: number) =>
    fetch(new URL(path, baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Secret': sharedSecret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

  return {
    async classifyReport(input): Promise<Classification | null> {
      try {
        const res = await post('/classify-report', input, CLASSIFY_TIMEOUT_MS);
        if (!res.ok) return null;
        const parsed = ClassificationSchema.safeParse(await res.json());
        return parsed.success ? parsed.data : null;
      } catch {
        return null; // unreachable or timed out — accept the report anyway
      }
    },

    async chat(input): Promise<ChatResponse> {
      let res: Response;
      try {
        res = await post('/chat', input, CHAT_TIMEOUT_MS);
      } catch {
        throw new ApiError(
          'AI_UNAVAILABLE',
          'The campus assistant is unavailable right now. Try again shortly.',
        );
      }
      if (!res.ok) {
        throw new ApiError(
          'AI_UNAVAILABLE',
          'The campus assistant is unavailable right now. Try again shortly.',
        );
      }
      const parsed = ChatResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        throw new ApiError(
          'AI_UNAVAILABLE',
          'The campus assistant returned an unexpected response.',
        );
      }
      return parsed.data;
    },

    async isHealthy() {
      try {
        const res = await fetch(new URL('/health', baseUrl), {
          signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
