import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/errors';
import { createReport } from '../src/services/reports';
import { fakeDeps, USER_A } from './fakes';

const input = { category: 'hazard' as const, title: 'Broken glass', lat: 35.2058, lng: -97.4457 };
const now = new Date('2026-09-24T15:00:00Z');

describe('createReport', () => {
  it('computes expires_at from the category TTL', async () => {
    const deps = fakeDeps();
    const { report } = await createReport(deps, USER_A, input, now);
    expect(report.expires_at).toBe('2026-09-25T03:00:00.000Z'); // hazard = 12h
  });

  it('accepts the report when the AI service is unavailable', async () => {
    const deps = fakeDeps();
    deps.ai.verdict = null;
    const { report } = await createReport(deps, USER_A, input, now);
    expect(report.category).toBe('hazard');
  });

  it('rejects confident spam', async () => {
    const deps = fakeDeps();
    deps.ai.verdict = { suggestedCategory: 'other', isSpam: true, confidence: 0.95, reason: 'ad' };
    await expect(createReport(deps, USER_A, input, now)).rejects.toBeInstanceOf(ApiError);
  });

  it('ignores low-confidence spam verdicts', async () => {
    const deps = fakeDeps();
    deps.ai.verdict = {
      suggestedCategory: 'other',
      isSpam: true,
      confidence: 0.5,
      reason: 'unsure',
    };
    await expect(createReport(deps, USER_A, input, now)).resolves.toBeDefined();
  });

  it('stores a confidently suggested category and uses its TTL', async () => {
    const deps = fakeDeps();
    deps.ai.verdict = {
      suggestedCategory: 'construction',
      isSpam: false,
      confidence: 0.9,
      reason: 'crew',
    };
    const result = await createReport(deps, USER_A, input, now);
    expect(result.report.category).toBe('construction');
    expect(result.categoryChangedFrom).toBe('hazard');
    expect(result.report.expires_at).toBe('2026-10-01T15:00:00.000Z'); // construction = 7d
  });

  it('associates the nearest building when none is given', async () => {
    const deps = fakeDeps();
    deps.reports.nearest = 'b-1';
    const { report } = await createReport(deps, USER_A, input, now);
    expect(report.building_id).toBe('b-1');
  });
});
