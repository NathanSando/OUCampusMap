import { z } from 'zod';

/** History is truncated to the last 6 messages before it reaches the AI service (design doc §8.4). */
export const MAX_HISTORY = 6;

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message is empty.').max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(50)
    .default([])
    .transform((h) => h.slice(-MAX_HISTORY)),
  userLocation: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
