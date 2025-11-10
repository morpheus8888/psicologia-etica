'use client';

import React, {
  createContext,
  useContext,
  useMemo,
} from 'react';

import { useFlipbookEngine } from './hooks/useFlipbookEngine';
import { useFlipbookSettings } from './hooks/useFlipbookSettings';
import type {
  FlipbookEngineApi,
  FlipbookProviderProps,
  FlipbookSettingsContextValue,
} from './types';

const FlipbookSettingsContext = createContext<FlipbookSettingsContextValue | null>(null);
const FlipbookEngineContext = createContext<FlipbookEngineApi | null>(null);

const FlipbookProvider: React.FC<FlipbookProviderProps> = ({
  flipbookId,
  pages,
  initialPage,
  settingsOverride,
  onPageChange,
  children,
}) => {
  const {
    settings,
    updateSettings,
    resetSettings,
    isReady,
  } = useFlipbookSettings(flipbookId, settingsOverride);

  const engine = useFlipbookEngine({
    pageCount: pages.length,
    initialPage,
    settings,
    onPageChange,
  });

  const settingsValue = useMemo<FlipbookSettingsContextValue>(() => ({
    settings,
    updateSettings,
    resetSettings,
    isReady,
  }), [isReady, resetSettings, settings, updateSettings]);

  return (
    <FlipbookSettingsContext.Provider value={settingsValue}>
      <FlipbookEngineContext.Provider value={engine}>{children}</FlipbookEngineContext.Provider>
    </FlipbookSettingsContext.Provider>
  );
};

const useFlipbookSettingsContext = () => {
  const context = useContext(FlipbookSettingsContext);
  if (!context) {
    throw new Error('useFlipbookSettingsContext must be used within a FlipbookProvider');
  }
  return context;
};
const useFlipbookEngineContext = () => {
  const context = useContext(FlipbookEngineContext);
  if (!context) {
    throw new Error('useFlipbookEngineContext must be used within a FlipbookProvider');
  }
  return context;
};

export {
  FlipbookProvider,
  useFlipbookEngineContext,
  useFlipbookSettingsContext,
};
