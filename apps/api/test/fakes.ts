import type { Report, VoteResponse } from '@ou-campus-map/shared-types';
import type { AiClient, Classification, Deps, NewReport, ReportStore } from '../src/services/types';

export const USER_A = '11111111-1111-4111-8111-111111111111';
export const USER_B = '22222222-2222-4222-8222-222222222222';
export const TOKENS: Record<string, string> = { 'token-a': USER_A, 'token-b': USER_B };

export class FakeReportStore implements ReportStore {
  reports = new Map<string, Report>();
  votes = new Map<string, 1 | -1>();
  nearest: string | null = null;
  private seq = 0;

  async insert(r: NewReport): Promise<Report> {
    const id = `00000000-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`;
    const report: Report = {
      id,
      user_id: r.userId,
      category: r.category,
      title: r.title,
      description: r.description ?? null,
      building_id: r.buildingId,
      lat: r.lat,
      lng: r.lng,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      created_at: new Date().toISOString(),
      expires_at: r.expiresAt.toISOString(),
    };
    this.reports.set(id, report);
    return report;
  }

  async castVote(reportId: string, userId: string, vote: 1 | -1): Promise<VoteResponse | null> {
    const report = this.reports.get(reportId);
    if (!report || report.status !== 'active') return null;
    this.votes.set(`${reportId}:${userId}`, vote);
    const mine = [...this.votes].filter(([k]) => k.startsWith(`${reportId}:`)).map(([, v]) => v);
    report.upvotes = mine.filter((v) => v === 1).length;
    report.downvotes = mine.filter((v) => v === -1).length;
    if (report.upvotes - report.downvotes <= -5) report.status = 'removed';
    return { upvotes: report.upvotes, downvotes: report.downvotes, status: report.status };
  }

  async getOwner(reportId: string) {
    const r = this.reports.get(reportId);
    return r ? { userId: r.user_id, status: r.status } : null;
  }

  async softDelete(reportId: string) {
    const r = this.reports.get(reportId);
    if (r) r.status = 'removed';
  }

  async nearestBuildingId() {
    return this.nearest;
  }
}

export class FakeAi implements AiClient {
  verdict: Classification | null = null;
  healthy = true;
  chatFails = false;

  async classifyReport() {
    return this.verdict;
  }

  async chat(input: { message: string }) {
    if (this.chatFails) {
      const { ApiError } = await import('../src/errors');
      throw new ApiError('AI_UNAVAILABLE', 'down');
    }
    return { reply: `echo: ${input.message}`, referencedPlaces: [] };
  }

  async isHealthy() {
    return this.healthy;
  }
}

export function fakeDeps(): Deps & { reports: FakeReportStore; ai: FakeAi } {
  return {
    auth: { verifyToken: async (t) => (TOKENS[t] ? { id: TOKENS[t] } : null) },
    reports: new FakeReportStore(),
    ai: new FakeAi(),
  };
}
