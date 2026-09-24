import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { fakeDeps } from './fakes';

// TODO(team): add integration tests against a test Supabase project (design doc §12).
// These tests exercise the HTTP layer against in-memory fakes.

const body = {
  category: 'elevator_outage',
  title: 'Elevator out in Devon',
  lat: 35.21076,
  lng: -97.4418,
};

describe('GET /api/health', () => {
  it('reports AI service status', async () => {
    const deps = fakeDeps();
    deps.ai.healthy = false;
    const res = await request(createApp(deps)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', aiService: 'down' });
  });
});

describe('POST /api/reports', () => {
  it('requires auth', async () => {
    const res = await request(createApp(fakeDeps())).post('/api/reports').send(body);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('validates the payload', async () => {
    const res = await request(createApp(fakeDeps()))
      .post('/api/reports')
      .set('Authorization', 'Bearer token-a')
      .send({ ...body, title: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a report', async () => {
    const res = await request(createApp(fakeDeps()))
      .post('/api/reports')
      .set('Authorization', 'Bearer token-a')
      .send(body);
    expect(res.status).toBe(201);
    expect(res.body.report).toMatchObject({ category: 'elevator_outage', status: 'active' });
  });

  it('rate-limits at 5 reports per user per hour', async () => {
    const app = createApp(fakeDeps());
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/reports')
        .set('Authorization', 'Bearer token-a')
        .send(body)
        .expect(201);
    }
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', 'Bearer token-a')
      .send(body);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    // A different user is unaffected.
    await request(app)
      .post('/api/reports')
      .set('Authorization', 'Bearer token-b')
      .send(body)
      .expect(201);
  });
});

describe('POST /api/reports/:id/vote', () => {
  it('upserts votes and auto-hides at net -5', async () => {
    const deps = fakeDeps();
    const app = createApp(deps);
    const created = await request(app)
      .post('/api/reports')
      .set('Authorization', 'Bearer token-a')
      .send(body);
    const id = created.body.report.id;

    const up = await request(app)
      .post(`/api/reports/${id}/vote`)
      .set('Authorization', 'Bearer token-b')
      .send({ vote: 1 });
    expect(up.body).toMatchObject({ upvotes: 1, downvotes: 0 });

    // Changing a vote replaces it rather than adding a second one.
    const down = await request(app)
      .post(`/api/reports/${id}/vote`)
      .set('Authorization', 'Bearer token-b')
      .send({ vote: -1 });
    expect(down.body).toMatchObject({ upvotes: 0, downvotes: 1 });

    for (let i = 0; i < 4; i++) {
      await deps.reports.castVote(id, `voter-${i}`, -1);
    }
    expect(deps.reports.reports.get(id)?.status).toBe('removed');
  });

  it('404s for unknown reports', async () => {
    const res = await request(createApp(fakeDeps()))
      .post('/api/reports/00000000-0000-4000-8000-000000000999/vote')
      .set('Authorization', 'Bearer token-a')
      .send({ vote: 1 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/reports/:id', () => {
  it('only lets the author delete', async () => {
    const app = createApp(fakeDeps());
    const created = await request(app)
      .post('/api/reports')
      .set('Authorization', 'Bearer token-a')
      .send(body);
    const id = created.body.report.id;

    await request(app)
      .delete(`/api/reports/${id}`)
      .set('Authorization', 'Bearer token-b')
      .expect(403);
    await request(app)
      .delete(`/api/reports/${id}`)
      .set('Authorization', 'Bearer token-a')
      .expect(204);
  });
});

describe('POST /api/assistant/chat', () => {
  it('works signed out', async () => {
    const res = await request(createApp(fakeDeps()))
      .post('/api/assistant/chat')
      .send({ message: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('echo: hello');
  });

  it('returns AI_UNAVAILABLE when the AI service is down', async () => {
    const deps = fakeDeps();
    deps.ai.chatFails = true;
    const res = await request(createApp(deps))
      .post('/api/assistant/chat')
      .send({ message: 'hello' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });
});

describe('unknown routes', () => {
  it('use the standard error shape', async () => {
    const res = await request(createApp(fakeDeps())).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } });
  });
});
