import type { HealthResponse } from '@ou-campus-map/shared-types';
import { Router } from 'express';
import type { Deps } from '../services/types';

/** Also used to keep the free-tier instance warm before a demo. */
export function healthRouter(deps: Deps): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      aiService: (await deps.ai.isHealthy()) ? 'up' : 'down',
    };
    res.json(body);
  });
  return router;
}
