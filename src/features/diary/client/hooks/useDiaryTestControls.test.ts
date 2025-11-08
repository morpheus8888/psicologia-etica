import { describe, expect, it } from 'vitest';

import {
  createDefaultDiaryTestControlsState,
  parseDiaryTestControls,
  type DiaryTestControlsState,
} from './useDiaryTestControls';

const buildPayload = (overrides?: Partial<DiaryTestControlsState>) => ({
  version: 1,
  state: {
    ...createDefaultDiaryTestControlsState(),
    ...overrides,
  },
});

describe('useDiaryTestControls helpers', () => {
  it('returns null for invalid payloads', () => {
    expect(parseDiaryTestControls(null)).toBeNull();
    expect(parseDiaryTestControls('not-json')).toBeNull();

    const wrongVersion = JSON.stringify({ version: 2, state: createDefaultDiaryTestControlsState() });
    expect(parseDiaryTestControls(wrongVersion)).toBeNull();
  });

  it('hydrates valid payloads', () => {
    const payload = buildPayload({
      appearance: {
        font: 'serif',
        color: 'ocean',
        lineHeightRem: 2,
        lineOffsetRem: 1.1,
      },
      flip: {
        flippingTimeMs: 600,
        usePortrait: true,
        swipeDistance: 44,
        drawShadow: true,
        maxShadowOpacity: 0.5,
        showPageCorners: false,
      },
    });
    expect(parseDiaryTestControls(JSON.stringify(payload))).toEqual(payload.state);
  });

  it('clamps out-of-range numbers', () => {
    const payload = {
      version: 1,
      state: {
        appearance: {
          font: 'mono',
          color: 'sepia',
          lineHeightRem: 10,
          lineOffsetRem: -3,
        },
        flip: {
          flippingTimeMs: 9999,
          usePortrait: false,
          swipeDistance: -10,
          drawShadow: true,
          maxShadowOpacity: 3,
          showPageCorners: false,
        },
      },
    };

    expect(parseDiaryTestControls(JSON.stringify(payload))).toEqual({
      appearance: {
        font: 'mono',
        color: 'sepia',
        lineHeightRem: 2.2,
        lineOffsetRem: 0.9,
      },
      flip: {
        flippingTimeMs: 1200,
        usePortrait: false,
        swipeDistance: 10,
        drawShadow: true,
        maxShadowOpacity: 1,
        showPageCorners: false,
      },
    });
  });
});
