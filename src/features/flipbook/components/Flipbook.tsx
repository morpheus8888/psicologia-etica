'use client';

import React, { useMemo, useState } from 'react';

import { cn } from '@/utils/Helpers';

import { FlipbookProvider, useFlipbookSettingsContext } from '../FlipbookProvider';
import type { FlipbookSettings, FlipbookTheme } from '../types';
import { buildCssVariables } from '../utils/geometry';
import { FlipbookContinuousView } from './FlipbookContinuousView';
import { FlipbookPagedView } from './FlipbookPagedView';
import { FlipbookSettingsPanel } from './FlipbookSettings';
import { FlipbookToolbar } from './FlipbookToolbar';

type FlipbookProps = {
  pages: React.ReactNode[];
  flipbookId?: string;
  initialPage?: number;
  settingsOverride?: Partial<FlipbookSettings>;
  className?: string;
  style?: React.CSSProperties;
  showSettings?: boolean;
  onPageChange?: (page: number) => void;
};

type ThemePreset = {
  book: string;
  spread: string;
  page: string;
  text: string;
};

const THEME_PRESETS: Record<FlipbookTheme, ThemePreset> = {
  paper: {
    book: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.9), rgba(210,190,150,0.8))',
    spread: 'linear-gradient(90deg, rgba(255,255,255,0.35), rgba(0,0,0,0.08), rgba(255,255,255,0.35))',
    page: 'linear-gradient(180deg, #ffffff 0%, #f8f4ea 100%)',
    text: '#2f261d',
  },
  dark: {
    book: 'linear-gradient(135deg, #1e1b2e, #05040b)',
    spread: 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
    page: 'linear-gradient(180deg, #1f1d2b, #0e0d17)',
    text: '#f6f4ff',
  },
  sepia: {
    book: 'linear-gradient(120deg, #f0e6d2, #dfc4a1)',
    spread: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(186,140,87,0.35), rgba(255,255,255,0.2))',
    page: 'linear-gradient(180deg, #fff5e1, #f2d9b4)',
    text: '#3e2b1a',
  },
  custom: {
    book: 'linear-gradient(135deg, rgba(118, 69, 242, 0.5), rgba(0, 0, 0, 0.9))',
    spread: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(118,69,242,0.35), rgba(255,255,255,0.15))',
    page: 'linear-gradient(180deg, rgba(19, 16, 23, 0.98), rgba(5, 5, 8, 0.95))',
    text: '#f5e9ff',
  },
};

const FlipbookContent: React.FC<{ pages: React.ReactNode[]; className?: string; style?: React.CSSProperties; showSettings: boolean }> = ({
  pages,
  className,
  style,
  showSettings,
}) => {
  const { settings } = useFlipbookSettingsContext();
  const [settingsVisible, setSettingsVisible] = useState(showSettings);

  const cssVariables = useMemo(() => {
    const theme = THEME_PRESETS[settings.theme] ?? THEME_PRESETS.paper;
    return {
      ...buildCssVariables(settings),
      '--flipbook-book-bg': theme.book,
      '--flipbook-spread-bg': theme.spread,
      '--flipbook-page-bg': theme.page,
      '--flipbook-text': theme.text,
    } as React.CSSProperties;
  }, [settings]);

  return (
    <div className={cn('flex flex-col gap-6', className)} style={{ ...cssVariables, ...style }}>
      <FlipbookToolbar
        onToggleSettings={showSettings ? () => setSettingsVisible(value => !value) : undefined}
        settingsVisible={settingsVisible}
      />
      <div
        className="rounded-[32px] border border-border/80 p-4 shadow-2xl ring-1 ring-black/5"
        style={{ background: 'color-mix(in srgb, var(--flipbook-book-bg) 35%, transparent)' }}
      >
        {settings.continuousScroll ? <FlipbookContinuousView pages={pages} /> : <FlipbookPagedView pages={pages} />}
      </div>
      {settingsVisible && showSettings ? <FlipbookSettingsPanel /> : null}
    </div>
  );
};

const Flipbook: React.FC<FlipbookProps> = ({
  pages,
  flipbookId = 'flipbook-default',
  initialPage,
  settingsOverride,
  className,
  style,
  showSettings = true,
  onPageChange,
}) => {
  return (
    <FlipbookProvider
      flipbookId={flipbookId}
      pages={pages}
      initialPage={initialPage}
      settingsOverride={settingsOverride}
      onPageChange={onPageChange}
    >
      <FlipbookContent pages={pages} className={className} style={style} showSettings={showSettings} />
    </FlipbookProvider>
  );
};

export { Flipbook };
