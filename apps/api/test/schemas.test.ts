import { describe, expect, it } from 'vitest';
import { ChatRequestSchema, MAX_HISTORY } from '../src/schemas/assistant';
import { CreateReportSchema, VoteSchema } from '../src/schemas/reports';

const valid = { category: 'elevator_outage', title: 'Elevator out', lat: 35.2058, lng: -97.4457 };

describe('CreateReportSchema', () => {
  it('accepts a valid report', () => {
    expect(CreateReportSchema.safeParse(valid).success).toBe(true);
  });

  it('enforces title length 3–100', () => {
    expect(CreateReportSchema.safeParse({ ...valid, title: 'ab' }).success).toBe(false);
    expect(CreateReportSchema.safeParse({ ...valid, title: 'x'.repeat(101) }).success).toBe(false);
  });

  it('caps descriptions at 500 characters and drops empty ones', () => {
    expect(CreateReportSchema.safeParse({ ...valid, description: 'x'.repeat(501) }).success).toBe(
      false,
    );
    const parsed = CreateReportSchema.parse({ ...valid, description: '   ' });
    expect(parsed.description).toBeUndefined();
  });

  it('rejects unknown categories', () => {
    expect(CreateReportSchema.safeParse({ ...valid, category: 'ufo' }).success).toBe(false);
  });

  it('rejects locations off the Norman campus', () => {
    // Oklahoma City
    expect(CreateReportSchema.safeParse({ ...valid, lat: 35.4676, lng: -97.5164 }).success).toBe(
      false,
    );
  });
});

describe('VoteSchema', () => {
  it('only allows +1 and -1', () => {
    expect(VoteSchema.safeParse({ vote: 1 }).success).toBe(true);
    expect(VoteSchema.safeParse({ vote: -1 }).success).toBe(true);
    expect(VoteSchema.safeParse({ vote: 0 }).success).toBe(false);
    expect(VoteSchema.safeParse({ vote: 2 }).success).toBe(false);
  });
});

describe('ChatRequestSchema', () => {
  it('truncates history to the last few messages', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: 'user' as const,
      content: `m${i}`,
    }));
    const parsed = ChatRequestSchema.parse({ message: 'hi', history });
    expect(parsed.history).toHaveLength(MAX_HISTORY);
    expect(parsed.history.at(-1)?.content).toBe('m9');
  });

  it('rejects empty messages', () => {
    expect(ChatRequestSchema.safeParse({ message: '   ' }).success).toBe(false);
  });
});
