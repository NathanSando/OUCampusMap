/**
 * Opening hours are stored as JSON keyed by day (design doc §6.2):
 *   { "mon": "07:00-22:00", "fri": "07:00-14:00,17:00-20:00", "sun": "closed" }
 * A missing day means "unknown", not "closed". Ranges may cross midnight ("20:00-02:00").
 */
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type WeeklyHours = Partial<Record<DayKey, string>>;

export type OpenState = 'open' | 'closed' | 'unknown';

const dayKey = (at: Date): DayKey => DAY_KEYS[at.getDay()] as DayKey;

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function rangeContains(range: string, minutes: number): boolean | null {
  const [start, end] = range.split('-').map(toMinutes);
  if (start == null || end == null) return null;
  if (end <= start) return minutes >= start || minutes < end; // crosses midnight
  return minutes >= start && minutes < end;
}

/** Is a place open at `at`? Uses the device/server's local time, which is Central time on campus. */
export function getOpenState(
  hours: WeeklyHours | null | undefined,
  at: Date = new Date(),
): OpenState {
  if (!hours) return 'unknown';
  const day = hours[dayKey(at)];
  if (day == null || day.trim() === '') return 'unknown';
  if (day.trim().toLowerCase() === 'closed') return 'closed';
  if (day.trim().toLowerCase() === '24h') return 'open';
  const minutes = at.getHours() * 60 + at.getMinutes();
  let parsedAny = false;
  for (const range of day.split(',')) {
    const hit = rangeContains(range, minutes);
    if (hit === null) continue;
    parsedAny = true;
    if (hit) return 'open';
  }
  return parsedAny ? 'closed' : 'unknown';
}

/** Human-readable hours for today, e.g. "7:00 AM – 2:00 PM". */
export function formatTodayHours(
  hours: WeeklyHours | null | undefined,
  at: Date = new Date(),
): string | null {
  const day = hours?.[dayKey(at)];
  if (!day) return null;
  if (day.toLowerCase() === 'closed') return 'Closed today';
  if (day.toLowerCase() === '24h') return 'Open 24 hours';
  return day
    .split(',')
    .map((range) => range.split('-').map(formatClock).join(' – '))
    .join(', ');
}

function formatClock(hhmm: string): string {
  const mins = toMinutes(hhmm);
  if (mins == null) return hhmm;
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
