import { describe, expect, it } from 'vitest';

import { isEntryEditable } from '../is-entry-editable';

describe('isEntryEditable', () => {
  const todayISO = '2025-01-10';
  const nowISO = `${todayISO}T00:30:00.000Z`;
  const clientTodayISO = todayISO;
  const clientNow = Date.parse(nowISO);

  it('allows editing for the current server date', () => {
    expect(isEntryEditable(todayISO, todayISO, null, nowISO, clientTodayISO, clientNow)).toBe(true);
  });

  it('allows editing for the current client date even if server differs', () => {
    expect(isEntryEditable(todayISO, '2025-01-09', 0, nowISO, clientTodayISO, clientNow)).toBe(true);
  });

  it('allows editing within the configured grace window', () => {
    const previousDay = '2025-01-09';
    const graceMinutes = 180; // 3 hours
    const clientReference = Date.parse('2025-01-10T02:15:00.000Z'); // ~2h15 diff

    expect(isEntryEditable(previousDay, todayISO, graceMinutes, nowISO, clientTodayISO, clientReference)).toBe(true);
  });

  it('denies editing outside the grace window', () => {
    const previousDay = '2025-01-09';
    const graceMinutes = 60;
    const clientReference = clientNow + (graceMinutes + 10) * 60 * 1000;

    expect(isEntryEditable(previousDay, todayISO, graceMinutes, nowISO, clientTodayISO, clientReference)).toBe(false);
  });

  it('falls back to server time when client time is invalid', () => {
    const previousDay = '2025-01-09';
    const graceMinutes = 60;
    const serverWithinGraceISO = `${todayISO}T00:50:00.000Z`;
    const serverOutsideGraceISO = `${todayISO}T02:00:00.000Z`;

    expect(
      isEntryEditable(previousDay, todayISO, graceMinutes, serverWithinGraceISO, clientTodayISO, Number.NaN),
    ).toBe(true);

    expect(
      isEntryEditable(previousDay, todayISO, graceMinutes, serverOutsideGraceISO, clientTodayISO, Number.NaN),
    ).toBe(false);
  });
});
