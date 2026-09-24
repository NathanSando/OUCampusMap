import { describe, expect, it } from 'vitest';
import { computeReportExpiry } from './enums';
import { formatTodayHours, getOpenState } from './hours';

// 2026-09-23 is a Wednesday.
const wed = (h: number, m = 0) => new Date(2026, 8, 23, h, m);

describe('getOpenState', () => {
  it('returns unknown when hours are missing', () => {
    expect(getOpenState(null, wed(12))).toBe('unknown');
    expect(getOpenState({ mon: '07:00-22:00' }, wed(12))).toBe('unknown');
  });

  it('handles a simple range', () => {
    const hours = { wed: '07:00-14:00' };
    expect(getOpenState(hours, wed(6, 59))).toBe('closed');
    expect(getOpenState(hours, wed(7))).toBe('open');
    expect(getOpenState(hours, wed(14))).toBe('closed');
  });

  it('handles split ranges and ranges past midnight', () => {
    expect(getOpenState({ wed: '08:00-14:00,16:30-20:00' }, wed(15))).toBe('closed');
    expect(getOpenState({ wed: '08:00-14:00,16:30-20:00' }, wed(17))).toBe('open');
    expect(getOpenState({ wed: '13:00-00:00' }, wed(23, 30))).toBe('open');
  });

  it('understands closed and 24h', () => {
    expect(getOpenState({ wed: 'closed' }, wed(12))).toBe('closed');
    expect(getOpenState({ wed: '24h' }, wed(3))).toBe('open');
  });
});

describe('formatTodayHours', () => {
  it('formats ranges in 12-hour time', () => {
    expect(formatTodayHours({ wed: '07:00-14:30' }, wed(9))).toBe('7:00 AM – 2:30 PM');
  });
});

describe('computeReportExpiry', () => {
  it('applies the per-category TTL', () => {
    const t = new Date('2026-09-23T12:00:00Z');
    expect(computeReportExpiry('elevator_outage', t).toISOString()).toBe(
      '2026-09-24T12:00:00.000Z',
    );
    expect(computeReportExpiry('construction', t).toISOString()).toBe('2026-09-30T12:00:00.000Z');
    expect(computeReportExpiry('event', t).toISOString()).toBe('2026-09-24T00:00:00.000Z');
  });
});
