import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { errorBody } from '../errors';

const HOUR = 60 * 60 * 1000;

const byUserOrIp = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? '');

function limiter(
  limit: number,
  message: string,
  keyGenerator: (req: Request) => string = byUserOrIp,
) {
  return rateLimit({
    windowMs: HOUR,
    limit,
    keyGenerator,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(errorBody('RATE_LIMITED', message));
    },
  });
}

/**
 * In-memory stores — fine for a single instance (design doc §7.3).
 * Each call creates fresh limiters, so tests get isolated counters.
 */
export function createRateLimiters() {
  return {
    createReport: limiter(5, "You've posted 5 reports in the last hour. Try again later."),
    vote: limiter(60, "You're voting too quickly. Try again later."),
    chatPerUser: limiter(20, "You've reached the assistant's hourly limit. Try again later."),
    chatPerIp: limiter(
      60,
      'Too many assistant requests from this network. Try again later.',
      (req) => ipKeyGenerator(req.ip ?? ''),
    ),
  };
}
