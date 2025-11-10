import type React from 'react';

import type { FlipbookSettings } from '../types';

export type FlipbookSpread = {
  left: React.ReactNode | null;
  right: React.ReactNode | null;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export const createSpreads = (pages: React.ReactNode[], twoPage: boolean): FlipbookSpread[] => {
  if (!twoPage) {
    return pages.map(page => ({
      left: null,
      right: page ?? null,
    }));
  }
  const nodes = [...pages];
  if (nodes.length % 2 !== 0) {
    nodes.push(null);
  }
  const spreads: FlipbookSpread[] = [];
  for (let index = 0; index < nodes.length; index += 2) {
    spreads.push({
      left: nodes[index] ?? null,
      right: nodes[index + 1] ?? null,
    });
  }
  return spreads;
};

export const toSpreadIndex = (pageIndex: number, twoPage: boolean): number => {
  if (!twoPage) {
    return pageIndex;
  }
  return Math.floor(pageIndex / 2);
};

export const fromSpreadIndex = (spreadIndex: number, role: 'left' | 'right', twoPage: boolean): number => {
  if (!twoPage) {
    return spreadIndex;
  }
  return spreadIndex * 2 + (role === 'right' ? 1 : 0);
};

export const buildCssVariables = (settings: FlipbookSettings): Record<string, string> => ({
  '--flipbook-shadow': settings.shadows.toString(),
  '--flipbook-curl': settings.curlIntensity.toString(),
  '--flipbook-thickness': settings.pageThickness.toString(),
  '--flipbook-gutter': settings.gutterDepth.toString(),
  '--flipbook-zoom': settings.zoom.toString(),
});
