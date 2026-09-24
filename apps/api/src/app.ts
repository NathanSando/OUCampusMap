import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './errors';
import { createRateLimiters } from './middleware/rateLimit';
import { assistantRouter } from './routes/assistant';
import { healthRouter } from './routes/health';
import { reportsRouter } from './routes/reports';
import type { Deps } from './services/types';

export function createApp(deps: Deps): Express {
  const app = express();
  const limits = createRateLimiters();

  // Render/Railway sit behind one proxy; needed so rate limiting sees the real client IP.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: deps.corsOrigins?.length ? deps.corsOrigins : false }));
  app.use(express.json({ limit: '32kb' }));

  const api = express.Router();
  api.use('/health', healthRouter(deps));
  api.use('/reports', reportsRouter(deps, limits));
  api.use('/assistant', assistantRouter(deps, limits));

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
