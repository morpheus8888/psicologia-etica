import type { FlipbookSettings } from './types';

export const FLIPBOOK_STORAGE_VERSION = 1;

export const getFlipbookStorageKey = (flipbookId: string) => `flipbook.settings.v${FLIPBOOK_STORAGE_VERSION}:${flipbookId}`;

export const DEFAULT_FLIPBOOK_SETTINGS: FlipbookSettings = {
  animation: 'curl',
  speed: 1,
  inertia: 0.6,
  snapThreshold: 0.35,
  shadows: 0.7,
  curlIntensity: 0.7,
  pageThickness: 4,
  gutterDepth: 8,
  theme: 'paper',
  twoPage: true,
  continuousScroll: false,
  zoom: 1,
  sound: false,
  soundVolume: 0.5,
  reduceMotion: 'system',
  showThumbnails: false,
  showToc: false,
  showBookmarks: false,
};

export const FLIPBOOK_MIN_SPEED = 0.2;
export const FLIPBOOK_MAX_SPEED = 2;
export const FLIPBOOK_MIN_INERTIA = 0;
export const FLIPBOOK_MAX_INERTIA = 1;
export const FLIPBOOK_MIN_SNAP = 0;
export const FLIPBOOK_MAX_SNAP = 1;
export const FLIPBOOK_MIN_INTENSITY = 0;
export const FLIPBOOK_MAX_INTENSITY = 1;
export const FLIPBOOK_MIN_THICKNESS = 0;
export const FLIPBOOK_MAX_THICKNESS = 12;
export const FLIPBOOK_MIN_GUTTER = 0;
export const FLIPBOOK_MAX_GUTTER = 24;
export const FLIPBOOK_MIN_SHADOW = 0;
export const FLIPBOOK_MAX_SHADOW = 1;
export const FLIPBOOK_MIN_ZOOM = 1;
export const FLIPBOOK_MAX_ZOOM = 3;
