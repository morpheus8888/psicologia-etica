'use client';

import '../flipbook6.css';

import { useTranslations } from 'next-intl';
import type { FormEvent, ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/Helpers';

type Flipbook6PagesCopy = {
  cover: {
    title: string;
    subtitle: string;
    footnote: string;
  };
  mood: {
    title: string;
    body: string;
    footnote: string;
  };
  note: {
    heading: string;
    editable: string;
    placeholder: string;
  };
  calendar: {
    heading: string;
    subheading: string;
    hint: string;
  };
  summary: {
    heading: string;
    items: string[];
  };
  back: {
    title: string;
    subtitle: string;
  };
};

type PageDescriptor = {
  id: string;
  variant: 'cover' | 'mood' | 'note' | 'calendar' | 'summary' | 'back';
  editable?: boolean;
  pageNumber?: number;
};

type Flipbook6DemoProps = {
  locale: string;
};

const assetFiles = [
  { key: 'background', filename: 'background.jpg' },
  { key: 'cover_front', filename: 'cover-front.jpg' },
  { key: 'cover_back', filename: 'cover-back.jpg' },
  { key: 'paper', filename: 'paper-texture.jpg' },
] as const;

const Flipbook6Demo = ({ locale }: Flipbook6DemoProps) => {
  const t = useTranslations('Flipbook6Page');
  const [pageIndex, setPageIndex] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const editorsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const calendarPlaceholders = useMemo(() => Array.from({ length: 14 }, (_, index) => index + 1), []);

  const pageText = useMemo(
    () => t.raw('pages') as Flipbook6PagesCopy,
    [t],
  );

  const bulletList = useMemo(
    () => (t.raw('bullets') as string[]) ?? [],
    [t],
  );

  const pageDefinitions = useMemo<PageDescriptor[]>(() => ([
    { id: 'cover-front', variant: 'cover' },
    { id: 'mood', variant: 'mood' },
    { id: 'note-1', variant: 'note', editable: true, pageNumber: 1 },
    { id: 'calendar', variant: 'calendar' },
    { id: 'note-2', variant: 'note', editable: true, pageNumber: 2 },
    { id: 'summary', variant: 'summary' },
    { id: 'note-3', variant: 'note', editable: true, pageNumber: 3 },
    { id: 'cover-back', variant: 'back' },
  ]), []);

  const pageCount = pageDefinitions.length;
  const maxSpreadIndex = Math.ceil(pageCount / 2) - 1;

  const currentSpreadIndex = Math.min(maxSpreadIndex, Math.floor(pageIndex / 2));
  const leftPage = pageDefinitions[currentSpreadIndex * 2] ?? null;
  const rightPage = pageDefinitions[currentSpreadIndex * 2 + 1] ?? null;

  const handleEditableInput = useCallback((event: FormEvent<HTMLDivElement>) => {
    const editor = event.currentTarget;
    const value = editor.textContent ?? '';
    editor.dataset.hasContent = value.trim() ? 'true' : 'false';
  }, []);

  const registerEditor = useCallback((pageId: string) => (node: HTMLDivElement | null) => {
    if (!node) {
      delete editorsRef.current[pageId];
      return;
    }
    editorsRef.current[pageId] = node;
    node.dataset.hasContent = (node.textContent ?? '').trim() ? 'true' : 'false';
  }, []);

  const goTo = useCallback((direction: 'next' | 'prev') => {
    setFlipDirection(direction);
    setTimeout(() => setFlipDirection(null), 500);

    setPageIndex((prev) => {
      if (direction === 'next') {
        return Math.min(pageCount - 1, prev + 2);
      }
      return Math.max(0, prev - 2);
    });
  }, [pageCount]);

  const renderPage = useCallback((page: PageDescriptor | null): ReactNode => {
    if (!page) {
      return <div className="flipbook6-page" aria-hidden="true" />;
    }

    const className = cn(
      'flipbook6-page',
      page.variant === 'cover' && 'flipbook6-page--cover',
      page.variant === 'back' && 'flipbook6-page--back',
      page.variant === 'note' && 'flipbook6-page--note',
      page.variant === 'calendar' && 'flipbook6-page--calendar',
    );

    if (page.variant === 'cover') {
      return (
        <article key={page.id} className={className}>
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-3">
              <span className="flipbook6-chip">{t('badge')}</span>
              <h3 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                {pageText.cover.title}
              </h3>
              <p className="text-base text-white/80">{pageText.cover.subtitle}</p>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">{pageText.cover.footnote}</p>
          </div>
        </article>
      );
    }

    if (page.variant === 'mood') {
      return (
        <article key={page.id} className={className}>
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-2">
              <span className="flipbook6-chip">{pageText.mood.footnote}</span>
              <h3 className="text-2xl font-semibold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                {pageText.mood.title}
              </h3>
              <p className="max-w-md text-sm text-white/80">{pageText.mood.body}</p>
            </div>
            <p className="text-xs text-white/60">{t('assets.hint')}</p>
          </div>
        </article>
      );
    }

    if (page.variant === 'note') {
      return (
        <article key={page.id} className={className}>
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between text-slate-700">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t('pages.note.heading', { page: page.pageNumber ?? 0 })}</p>
                <p className="text-lg font-semibold text-slate-800">{t('pages.note.heading', { page: page.pageNumber ?? 0 })}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {t('pages.note.editable')}
              </span>
            </div>
            <div
              role="textbox"
              tabIndex={0}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              aria-label={t('pages.note.heading', { page: page.pageNumber ?? 0 })}
              className="flipbook6-editor"
              data-placeholder={pageText.note.placeholder}
              data-has-content="false"
              ref={registerEditor(page.id)}
              onInput={handleEditableInput}
            />
          </div>
        </article>
      );
    }

    if (page.variant === 'calendar') {
      return (
        <article key={page.id} className={className}>
          <div className="flex h-full flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{pageText.calendar.subheading}</p>
              <h3 className="text-2xl font-semibold text-slate-900">{pageText.calendar.heading}</h3>
              <p className="text-sm text-slate-600">{pageText.calendar.hint}</p>
            </div>
            <div className="flipbook6-calendar-grid" aria-hidden="true">
              {calendarPlaceholders.map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </article>
      );
    }

    if (page.variant === 'summary') {
      return (
        <article key={page.id} className={className}>
          <div className="flex h-full flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t('badge')}</p>
            <h3 className="text-2xl font-semibold text-slate-900">{pageText.summary.heading}</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              {pageText.summary.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
      );
    }

    return (
      <article key={page.id} className={className}>
        <div className="flex h-full flex-col items-start justify-between text-white">
          <div className="space-y-3">
            <span className="flipbook6-chip">{t('badge')}</span>
            <h3 className="text-3xl font-semibold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
              {pageText.back.title}
            </h3>
            <p className="text-sm text-white/80">{pageText.back.subtitle}</p>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t('controls_panel.next')}</p>
        </div>
      </article>
    );
  }, [calendarPlaceholders, handleEditableInput, pageText, registerEditor, t]);

  const spreadClass = cn(
    'flipbook6-spread',
    flipDirection === 'next' && 'flipping-next',
    flipDirection === 'prev' && 'flipping-prev',
  );

  const assetLabels = useMemo(
    () => ({
      background: t('assets.background'),
      cover_front: t('assets.cover_front'),
      cover_back: t('assets.cover_back'),
      paper: t('assets.paper'),
    }),
    [t],
  );

  return (
    <div className="flipbook6-stage rounded-3xl border border-white/5">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <section className="flex w-full flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_80px_rgba(5,3,10,0.45)] backdrop-blur">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">{t('badge')}</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">{t('title')}</h2>
            <p className="text-sm text-white/80">{t('description')}</p>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">{t('hint.title')}</p>
              <p className="text-xs text-white/70">{t('hint.body')}</p>
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              {bulletList.map(entry => (
                <li key={entry} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-300" />
                  <span>{entry}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[150px] flex-1 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">{t('stats.locale_label')}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{locale}</p>
              </div>
              <div className="min-w-[150px] flex-1 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">{t('stats.pages_label')}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{pageCount}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">{t('assets.title')}</p>
            <p>{t('assets.hint')}</p>
            <div className="flipbook6-asset-list">
              {assetFiles.map(asset => (
                <div key={asset.key} className="flipbook6-asset">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">{assetLabels[asset.key]}</p>
                  <code>
                    /public/flipbook6/
                    {asset.filename}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex w-full flex-1 items-stretch">
          <div className="flipbook6-viewer">
            <div className={spreadClass} role="presentation">
              {renderPage(leftPage)}
              {renderPage(rightPage)}
            </div>

            <div
              className="flipbook6-controls"
              role="group"
              aria-label={t('controls_panel.title')}
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">{t('controls_panel.title')}</p>
                <p className="text-xs text-white/70">{t('controls_panel.description')}</p>
                <p className="text-xs text-white/60">{t('controls_panel.assets')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flipbook6-control"
                  onClick={() => goTo('prev')}
                  aria-label={t('controls_panel.previous')}
                  disabled={pageIndex <= 0}
                >
                  <span aria-hidden="true">←</span>
                  <span>{t('controls_panel.previous')}</span>
                </button>
                <button
                  type="button"
                  className="flipbook6-control"
                  onClick={() => goTo('next')}
                  aria-label={t('controls_panel.next')}
                  disabled={pageIndex >= pageCount - 1}
                >
                  <span>{t('controls_panel.next')}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Flipbook6Demo };
