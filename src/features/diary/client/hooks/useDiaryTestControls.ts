'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'diary:test-controls:v1';
const STORAGE_VERSION = 1;

const TEST_FLAG = process.env.NEXT_PUBLIC_DIARY_TEST_CONTROLS === '1';
const NODE_ENV = process.env.NODE_ENV;
const isDiaryTestControlsEnabled = TEST_FLAG || NODE_ENV !== 'production';

type DiaryAppearanceControls = {
  font: 'sans' | 'serif' | 'mono';
  color: 'ink' | 'sepia' | 'ocean';
  lineHeightRem: number;
  lineOffsetRem: number;
};

type DiaryFlipControls = {
  flippingTimeMs: number;
  usePortrait: boolean;
  swipeDistance: number;
  drawShadow: boolean;
  maxShadowOpacity: number;
  showPageCorners: boolean;
};

export type DiaryTestControlsState = {
  appearance: DiaryAppearanceControls;
  flip: DiaryFlipControls;
};

const createDefaultDiaryTestControlsState = (): DiaryTestControlsState => ({
  appearance: {
    font: 'sans',
    color: 'ink',
    lineHeightRem: 1.75,
    lineOffsetRem: 1.5,
  },
  flip: {
    flippingTimeMs: 520,
    usePortrait: false,
    swipeDistance: 26,
    drawShadow: false,
    maxShadowOpacity: 0.28,
    showPageCorners: true,
  },
});

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const normaliseState = (next: DiaryTestControlsState | null | undefined): DiaryTestControlsState => {
  if (!next) {
    return createDefaultDiaryTestControlsState();
  }
  return {
    appearance: {
      font: next.appearance?.font ?? 'sans',
      color: next.appearance?.color ?? 'ink',
      lineHeightRem: clampNumber(next.appearance?.lineHeightRem ?? 1.75, 1.4, 2.2),
      lineOffsetRem: clampNumber(next.appearance?.lineOffsetRem ?? 1.5, 0.9, 2.2),
    },
    flip: {
      flippingTimeMs: clampNumber(next.flip?.flippingTimeMs ?? 520, 180, 1200),
      usePortrait: Boolean(next.flip?.usePortrait),
      swipeDistance: clampNumber(next.flip?.swipeDistance ?? 26, 10, 60),
      drawShadow: Boolean(next.flip?.drawShadow),
      maxShadowOpacity: clampNumber(next.flip?.maxShadowOpacity ?? 0.28, 0, 1),
      showPageCorners: next.flip?.showPageCorners !== false,
    },
  };
};

type StoredPayload = {
  version: number;
  state: DiaryTestControlsState;
};

const parseDiaryTestControls = (raw: string | null): DiaryTestControlsState | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredPayload;
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      return null;
    }
    return normaliseState(parsed.state);
  } catch {
    return null;
  }
};

type UpdateAppearanceFn = (patch: Partial<DiaryAppearanceControls>) => void;
type UpdateFlipFn = (patch: Partial<DiaryFlipControls>) => void;

type UseDiaryTestControlsReturn = {
  state: DiaryTestControlsState;
  updateAppearance: UpdateAppearanceFn;
  updateFlip: UpdateFlipFn;
  reset: () => void;
  enabled: boolean;
};

const useDiaryTestControls = (): UseDiaryTestControlsReturn => {
  const [state, setState] = useState<DiaryTestControlsState>(() => createDefaultDiaryTestControlsState());
  const hasHydratedRef = useRef(!isDiaryTestControlsEnabled);

  useEffect(() => {
    if (!isDiaryTestControlsEnabled || typeof window === 'undefined') {
      return;
    }
    const fromStorage = parseDiaryTestControls(window.localStorage.getItem(STORAGE_KEY));
    if (fromStorage) {
      setState(fromStorage);
    }
    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!isDiaryTestControlsEnabled || typeof window === 'undefined') {
      return;
    }
    if (!hasHydratedRef.current) {
      return;
    }
    const payload: StoredPayload = {
      version: STORAGE_VERSION,
      state,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // noop – test controls are best effort only
    }
  }, [state]);

  const updateAppearance = useCallback<UpdateAppearanceFn>((patch) => {
    setState(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        ...patch,
      },
    }));
  }, []);

  const updateFlip = useCallback<UpdateFlipFn>((patch) => {
    setState(prev => ({
      ...prev,
      flip: {
        ...prev.flip,
        ...patch,
      },
    }));
  }, []);

  const reset = useCallback(() => {
    setState(createDefaultDiaryTestControlsState());
  }, []);

  return useMemo(() => ({
    state,
    updateAppearance,
    updateFlip,
    reset,
    enabled: isDiaryTestControlsEnabled,
  }), [state, updateAppearance, updateFlip, reset]);
};

export {
  useDiaryTestControls,
  isDiaryTestControlsEnabled,
  createDefaultDiaryTestControlsState,
  parseDiaryTestControls,
};
