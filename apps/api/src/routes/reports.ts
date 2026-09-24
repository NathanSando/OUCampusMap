import { Router } from 'express';
import { ApiError } from '../errors';
import { requireAuth } from '../middleware/auth';
import type { createRateLimiters } from '../middleware/rateLimit';
import { CreateReportSchema, ReportIdParamSchema, VoteSchema } from '../schemas/reports';
import { parse } from '../schemas/validate';
import { createReport } from '../services/reports';
import type { Deps } from '../services/types';

export function reportsRouter(deps: Deps, limits: ReturnType<typeof createRateLimiters>): Router {
  const router = Router();
  const auth = requireAuth(deps.auth);

  // POST /reports — validate, classify, compute expiry, insert via service role.
  router.post('/', auth, limits.createReport, async (req, res) => {
    const input = parse(CreateReportSchema, req.body);
    const result = await createReport(deps, req.user!.id, input);
    res.status(201).json(result);
  });

  // POST /reports/:id/vote — upsert the vote and recompute tallies atomically.
  router.post('/:id/vote', auth, limits.vote, async (req, res) => {
    const { id } = parse(ReportIdParamSchema, req.params);
    const { vote } = parse(VoteSchema, req.body);
    const result = await deps.reports.castVote(id, req.user!.id, vote);
    if (!result) throw new ApiError('NOT_FOUND', 'That report has expired or been removed.');
    res.json(result);
  });

  // DELETE /reports/:id — author-only soft delete.
  router.delete('/:id', auth, async (req, res) => {
    const { id } = parse(ReportIdParamSchema, req.params);
    const owner = await deps.reports.getOwner(id);
    if (!owner || owner.status === 'removed') throw new ApiError('NOT_FOUND', 'Report not found.');
    if (owner.userId !== req.user!.id) {
      throw new ApiError('FORBIDDEN', 'You can only delete your own reports.');
    }
    await deps.reports.softDelete(id);
    res.status(204).end();
  });

  return router;
}
