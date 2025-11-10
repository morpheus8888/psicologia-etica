'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_FLIPBOOK_SETTINGS,
  getFlipbookStorageKey,
} from '../constants';
import type { FlipbookSettings } from '../types';

const parseSettings = (raw: string): Partial<FlipbookSettings> | null => {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object') {
      return value as Partial<FlipbookSettings>;
    }
  } catch {
    // ignore
  }
  return null;
};

export const useFlipbookSettings = (flipbookId: string, override?: Partial<FlipbookSettings>) => {
  const [settings, setSettings] = useState<FlipbookSettings>(() => ({
    ...DEFAULT_FLIPBOOK_SETTINGS,
    ...(override ?? {}),
  }));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storageKey = getFlipbookStorageKey(flipbookId);
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue) {
      const parsed = parseSettings(storedValue);
      if (parsed) {
        setSettings({
          ...DEFAULT_FLIPBOOK_SETTINGS,
          ...parsed,
          ...(override ?? {}),
        });
      }
    } else if (override) {
      setSettings({
        ...DEFAULT_FLIPBOOK_SETTINGS,
        ...override,
      });
    }
    setIsReady(true);
  }, [flipbookId, override]);

  useEffect(() => {
    if (!isReady || typeof window === 'undefined') {
      return;
    }
    const storageKey = getFlipbookStorageKey(flipbookId);
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [flipbookId, isReady, settings]);

  useEffect(() => {
    if (!override) {
      return;
    }
    setSettings(current => ({
      ...current,
      ...override,
    }));
  }, [override]);

  const updateSettings = useCallback((patch: Partial<FlipbookSettings>) => {
    setSettings(current => ({
      ...current,
      ...patch,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({
      ...DEFAULT_FLIPBOOK_SETTINGS,
      ...(override ?? {}),
    });
  }, [override]);

  return useMemo(() => ({
    settings,
    updateSettings,
    resetSettings,
    isReady,
  }), [isReady, resetSettings, settings, updateSettings]);
};
