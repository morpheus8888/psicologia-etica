'use client';

import { ChevronLeft, ChevronRight, GripVertical, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/Helpers';

import { useFlipbookEngineContext, useFlipbookSettingsContext } from '../FlipbookProvider';

type FlipbookToolbarProps = {
  onToggleSettings?: () => void;
  settingsVisible?: boolean;
};

const FlipbookToolbar: React.FC<FlipbookToolbarProps> = ({ onToggleSettings, settingsVisible }) => {
  const t = useTranslations('flipbook.toolbar');
  const engine = useFlipbookEngineContext();
  const { settings, updateSettings } = useFlipbookSettingsContext();
  const totalPages = engine.state.pageCount;
  const currentIndex = engine.state.currentPage;
  const canGoPrev = !engine.state.isAnimating && currentIndex > 0;
  const canGoNext = !engine.state.isAnimating && currentIndex < totalPages - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/70 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('previous')}
          onClick={() => engine.goPrevious()}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('next')}
          onClick={() => engine.goNext()}
          disabled={!canGoNext}
        >
          <ChevronRight className="size-4" />
        </Button>
        <div className="rounded-full border border-dashed border-border/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('page', { current: currentIndex + 1, total: totalPages })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition',
            settings.twoPage ? 'border-primary bg-primary/10 text-primary' : 'border-border/80 text-muted-foreground',
          )}
          onClick={() => updateSettings({ twoPage: !settings.twoPage })}
        >
          <GripVertical className="size-3.5" />
          {settings.twoPage ? t('twoPage') : t('singlePage')}
        </button>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition',
            settings.continuousScroll
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/80 text-muted-foreground',
          )}
          onClick={() => updateSettings({ continuousScroll: !settings.continuousScroll })}
        >
          {settings.continuousScroll ? t('modeContinuous') : t('modePaged')}
        </button>
        <div className="flex items-center gap-1 rounded-full border border-border/80 px-3 py-1 text-xs font-semibold">
          <button
            type="button"
            className="text-lg leading-none text-muted-foreground hover:text-foreground"
            aria-label={t('zoomOut')}
            onClick={() => updateSettings({ zoom: Math.max(1, settings.zoom - 0.1) })}
          >
            −
          </button>
          <span className="tabular-nums text-muted-foreground">
            {settings.zoom.toFixed(1)}
            ×
          </span>
          <button
            type="button"
            className="text-lg leading-none text-muted-foreground hover:text-foreground"
            aria-label={t('zoomIn')}
            onClick={() => updateSettings({ zoom: Math.min(3, settings.zoom + 0.1) })}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold transition',
            settings.sound
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/80 text-muted-foreground',
          )}
          onClick={() => updateSettings({ sound: !settings.sound })}
        >
          {settings.sound
            ? t('soundOn')
            : t('soundOff')}
        </button>
        {onToggleSettings && (
          <Button
            type="button"
            size="sm"
            variant={
              settingsVisible
                ? 'secondary'
                : 'outline'
            }
            onClick={onToggleSettings}
            className="gap-2"
          >
            <Settings2 className="size-4" />
            {settingsVisible
              ? t('hideSettings')
              : t('showSettings')}
          </Button>
        )}
      </div>
    </div>
  );
};

export { FlipbookToolbar };
