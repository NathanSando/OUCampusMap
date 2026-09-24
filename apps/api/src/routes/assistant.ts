import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import type { createRateLimiters } from '../middleware/rateLimit';
import { ChatRequestSchema } from '../schemas/assistant';
import { parse } from '../schemas/validate';
import type { Deps } from '../services/types';

export function assistantRouter(deps: Deps, limits: ReturnType<typeof createRateLimiters>): Router {
  const router = Router();

  // POST /assistant/chat — auth optional; proxies to the AI service, which holds the OpenAI key.
  router.post(
    '/chat',
    optionalAuth(deps.auth),
    limits.chatPerIp,
    limits.chatPerUser,
    async (req, res) => {
      const input = parse(ChatRequestSchema, req.body);
      const response = await deps.ai.chat(input);
      res.json(response);
    },
  );

  return router;
}
