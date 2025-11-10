import type React from 'react';

export type FlipbookAnimationStyle = 'curl' | 'slide' | 'fade' | 'none';
export type FlipbookTheme = 'paper' | 'dark' | 'sepia' | 'custom';
export type FlipbookReduceMotion = 'system' | 'on' | 'off';

export type FlipbookSettings = {
  animation: FlipbookAnimationStyle;
  speed: number;
  inertia: number;
  snapThreshold: number;
  shadows: number;
  curlIntensity: number;
  pageThickness: number;
  gutterDepth: number;
  theme: FlipbookTheme;
  twoPage: boolean;
  continuousScroll: boolean;
  zoom: number;
  sound: boolean;
  soundVolume: number;
  reduceMotion: FlipbookReduceMotion;
  showThumbnails: boolean;
  showToc: boolean;
  showBookmarks: boolean;
};

export type FlipbookSettingsUpdater = (patch: Partial<FlipbookSettings>) => void;

export type FlipbookSettingsContextValue = {
  settings: FlipbookSettings;
  updateSettings: FlipbookSettingsUpdater;
  resetSettings: () => void;
  isReady: boolean;
};

export type FlipbookEngineDirection = 'next' | 'prev' | null;
export type FlipbookEngineMode = 'paged' | 'continuous';

export type FlipbookEngineState = {
  currentPage: number;
  targetPage: number | null;
  spreadIndex: number;
  progress: number;
  isAnimating: boolean;
  direction: FlipbookEngineDirection;
  pageCount: number;
  pagePairs: number;
  mode: FlipbookEngineMode;
};

export type FlipbookNavigationOptions = {
  animate?: boolean;
  source?: string;
};

export type FlipbookExternalController = {
  scrollToPage?: (page: number) => void;
};

export type FlipbookEngineApi = {
  state: FlipbookEngineState;
  goToPage: (page: number, options?: FlipbookNavigationOptions) => void;
  goNext: (options?: FlipbookNavigationOptions) => void;
  goPrevious: (options?: FlipbookNavigationOptions) => void;
  attachGestures: (element: HTMLElement | null) => void;
  setContinuousOffset: (offset: number) => void;
  registerExternalController: (controller: FlipbookExternalController | null) => void;
};

export type FlipbookEngineHookProps = {
  pageCount: number;
  initialPage?: number;
  settings: FlipbookSettings;
  onPageChange?: (page: number) => void;
  onNavigationComplete?: (page: number) => void;
};

export type FlipbookProviderProps = {
  flipbookId: string;
  pages: React.ReactNode[];
  initialPage?: number;
  settingsOverride?: Partial<FlipbookSettings>;
  onPageChange?: (page: number) => void;
  children: React.ReactNode;
};

export type FlipbookTelemetryEvent =
  | { type: 'flip-start'; page: number; direction: FlipbookEngineDirection }
  | { type: 'flip-complete'; page: number }
  | { type: 'settings-change'; patch: Partial<FlipbookSettings> };

export type FlipbookPageRenderProps = {
  index: number;
  role: 'left' | 'right';
  node: React.ReactNode;
};
