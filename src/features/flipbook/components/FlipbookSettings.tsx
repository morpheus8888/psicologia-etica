'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import {
  FLIPBOOK_MAX_GUTTER,
  FLIPBOOK_MAX_INERTIA,
  FLIPBOOK_MAX_INTENSITY,
  FLIPBOOK_MAX_SHADOW,
  FLIPBOOK_MAX_SNAP,
  FLIPBOOK_MAX_SPEED,
  FLIPBOOK_MAX_THICKNESS,
  FLIPBOOK_MAX_ZOOM,
  FLIPBOOK_MIN_GUTTER,
  FLIPBOOK_MIN_INERTIA,
  FLIPBOOK_MIN_INTENSITY,
  FLIPBOOK_MIN_SHADOW,
  FLIPBOOK_MIN_SNAP,
  FLIPBOOK_MIN_SPEED,
  FLIPBOOK_MIN_THICKNESS,
  FLIPBOOK_MIN_ZOOM,
} from '../constants';
import { useFlipbookSettingsContext } from '../FlipbookProvider';
import type { FlipbookSettings as FlipbookSettingsType } from '../types';

type SliderFieldKey =
  | 'speed'
  | 'inertia'
  | 'snapThreshold'
  | 'shadows'
  | 'curlIntensity'
  | 'pageThickness'
  | 'gutterDepth'
  | 'zoom'
  | 'soundVolume';

type SliderField = {
  key: SliderFieldKey;
  min: number;
  max: number;
  step: number;
  label: SliderFieldKey;
  format?: (value: number) => string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const sliderFields: SliderField[] = [
  { key: 'speed', min: FLIPBOOK_MIN_SPEED, max: FLIPBOOK_MAX_SPEED, step: 0.1, label: 'speed', format: value => `${value.toFixed(1)}×` },
  { key: 'inertia', min: FLIPBOOK_MIN_INERTIA, max: FLIPBOOK_MAX_INERTIA, step: 0.05, label: 'inertia', format: formatPercent },
  { key: 'snapThreshold', min: FLIPBOOK_MIN_SNAP, max: FLIPBOOK_MAX_SNAP, step: 0.05, label: 'snapThreshold', format: formatPercent },
  { key: 'shadows', min: FLIPBOOK_MIN_SHADOW, max: FLIPBOOK_MAX_SHADOW, step: 0.05, label: 'shadows', format: formatPercent },
  { key: 'curlIntensity', min: FLIPBOOK_MIN_INTENSITY, max: FLIPBOOK_MAX_INTENSITY, step: 0.05, label: 'curlIntensity', format: formatPercent },
  { key: 'pageThickness', min: FLIPBOOK_MIN_THICKNESS, max: FLIPBOOK_MAX_THICKNESS, step: 1, label: 'pageThickness', format: value => `${Math.round(value)}px` },
  { key: 'gutterDepth', min: FLIPBOOK_MIN_GUTTER, max: FLIPBOOK_MAX_GUTTER, step: 1, label: 'gutterDepth', format: value => `${Math.round(value)}px` },
  { key: 'zoom', min: FLIPBOOK_MIN_ZOOM, max: FLIPBOOK_MAX_ZOOM, step: 0.1, label: 'zoom', format: value => `${value.toFixed(1)}×` },
  { key: 'soundVolume', min: 0, max: 1, step: 0.05, label: 'soundVolume', format: formatPercent },
];

const FlipbookSettingsPanel: React.FC = () => {
  const t = useTranslations('flipbook.settings');
  const {
    settings,
    updateSettings,
    resetSettings,
  } = useFlipbookSettingsContext();

  return (
    <div className="rounded-3xl border border-border/80 bg-background/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => resetSettings()}>
          {t('reset')}
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('sections.animation')}
          </p>
          <Label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t('fields.animation')}</Label>
          <select
            className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm"
            value={settings.animation}
            onChange={event => updateSettings({ animation: event.target.value as FlipbookSettingsType['animation'] })}
          >
            <option value="curl">{t('animationOptions.curl')}</option>
            <option value="slide">{t('animationOptions.slide')}</option>
            <option value="fade">{t('animationOptions.fade')}</option>
            <option value="none">{t('animationOptions.none')}</option>
          </select>

          {sliderFields.slice(0, 3).map(field => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground/90">
                <span>{t(`fields.${field.label}`)}</span>
                <span className="tabular-nums text-foreground">
                  {field.format ? field.format(settings[field.key] as number) : settings[field.key]}
                </span>
              </div>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={settings[field.key] as number}
                onChange={event => updateSettings({ [field.key]: Number.parseFloat(event.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
              />
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('sections.style')}
          </p>
          <Label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t('fields.theme')}</Label>
          <select
            className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm"
            value={settings.theme}
            onChange={event => updateSettings({ theme: event.target.value as FlipbookSettingsType['theme'] })}
          >
            <option value="paper">{t('themes.paper')}</option>
            <option value="dark">{t('themes.dark')}</option>
            <option value="sepia">{t('themes.sepia')}</option>
            <option value="custom">{t('themes.custom')}</option>
          </select>

          {sliderFields.slice(3, 7).map(field => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground/90">
                <span>{t(`fields.${field.label}`)}</span>
                <span className="tabular-nums text-foreground">
                  {field.format ? field.format(settings[field.key] as number) : settings[field.key]}
                </span>
              </div>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={settings[field.key] as number}
                onChange={event => updateSettings({ [field.key]: Number.parseFloat(event.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
              />
            </div>
          ))}
        </section>
      </div>

      <Separator className="my-6" />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('sections.layout')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border border-border/70"
                checked={settings.showThumbnails}
                onChange={event => updateSettings({ showThumbnails: event.target.checked })}
              />
              {t('fields.showThumbnails')}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border border-border/70"
                checked={settings.showBookmarks}
                onChange={event => updateSettings({ showBookmarks: event.target.checked })}
              />
              {t('fields.showBookmarks')}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border border-border/70"
                checked={settings.showToc}
                onChange={event => updateSettings({ showToc: event.target.checked })}
              />
              {t('fields.showToc')}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border border-border/70"
                checked={settings.sound}
                onChange={event => updateSettings({ sound: event.target.checked })}
              />
              {t('fields.sound')}
            </label>
          </div>

          {sliderFields.slice(7).map(field => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground/90">
                <span>{t(`fields.${field.label}`)}</span>
                <span className="tabular-nums text-foreground">
                  {field.format ? field.format(settings[field.key] as number) : settings[field.key]}
                </span>
              </div>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={settings[field.key] as number}
                onChange={event => updateSettings({ [field.key]: Number.parseFloat(event.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
              />
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('sections.accessibility')}
          </p>
          <Label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t('fields.reduceMotion')}</Label>
          <select
            className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm"
            value={settings.reduceMotion}
            onChange={event => updateSettings({ reduceMotion: event.target.value as FlipbookSettingsType['reduceMotion'] })}
          >
            <option value="system">{t('reduceMotionOptions.system')}</option>
            <option value="on">{t('reduceMotionOptions.on')}</option>
            <option value="off">{t('reduceMotionOptions.off')}</option>
          </select>
          <Label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t('fields.continuousScroll')}</Label>
          <select
            className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm"
            value={settings.continuousScroll ? 'continuous' : 'paged'}
            onChange={event => updateSettings({ continuousScroll: event.target.value === 'continuous' })}
          >
            <option value="paged">{t('modeOptions.paged')}</option>
            <option value="continuous">{t('modeOptions.continuous')}</option>
          </select>
          <Label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t('fields.twoPage')}</Label>
          <select
            className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm"
            value={settings.twoPage ? 'two' : 'single'}
            onChange={event => updateSettings({ twoPage: event.target.value === 'two' })}
          >
            <option value="two">{t('twoPage')}</option>
            <option value="single">{t('singlePage')}</option>
          </select>
        </section>
      </div>
    </div>
  );
};

export { FlipbookSettingsPanel };
