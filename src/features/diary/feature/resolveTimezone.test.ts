import { describe, expect, it } from 'vitest';

import { resolveDiaryTimezone } from './resolveTimezone';

describe('resolveDiaryTimezone', () => {
  it('returns profile timezone when valid', () => {
    const tz = resolveDiaryTimezone({
      locale: 'it',
      profileTimezone: 'America/New_York',
    });

    expect(tz).toBe('America/New_York');
  });

  it('falls back to locale inferred timezone when profile is invalid', () => {
    const tz = resolveDiaryTimezone({
      locale: 'it',
      profileTimezone: 'Invalid/Zone',
    });

    expect(tz).toBe('Europe/Rome');
  });

  it('falls back to provided fallback timezone when locale inference fails', () => {
    const tz = resolveDiaryTimezone({
      locale: 'en',
      profileTimezone: null,
      fallbackTimezone: 'Europe/London',
    });

    expect(tz).toBe('Europe/London');
  });

  it('defaults to UTC when all candidates are invalid', () => {
    const tz = resolveDiaryTimezone({
      locale: 'en',
      profileTimezone: 'Not/AZone',
      fallbackTimezone: 'Not/Valid',
    });

    expect(tz).toBe('UTC');
  });
});
