'use client';

import 'page-flip/src/Style/stPageFlip.css';
import '../flipbook2.css';

import { useTranslations } from 'next-intl';
import type { FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { FocusSafeHTMLFlipBook, type PageFlipHandle } from '@/components/flipbook/FocusSafeHTMLFlipBook';
import { cn } from '@/utils/Helpers';

type Flipbook2PagesCopy = {
  cover: {
    title: string;
    subtitle: string;
    footnote: string;
  };
  intro: {
    heading: string;
    body: string[];
  };
  controls: {
    heading: string;
    body: string[];
  };
  gratitude: {
    heading: string;
    subheading: string;
    placeholder: string;
  };
  notes: {
    heading: string;
    subheading: string;
    placeholder: string;
  };
  free: {
    heading: string;
    subheading: string;
    placeholder: string;
  };
  summary: {
    heading: string;
    body: string[];
  };
  back: {
    title: string;
    subtitle: string;
  };
};

type PageDescriptor = {
  id: string;
  type: keyof Flipbook2PagesCopy | 'cover' | 'intro' | 'controls' | 'gratitude' | 'notes' | 'free' | 'summary' | 'back';
  density?: 'hard';
  editable?: boolean;
};

const storageKey = (pageId: string) => `flipbook2-page-${pageId}`;

const focusableTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);

type Flipbook2DemoProps = {
  locale: string;
};

const Flipbook2Demo = ({ locale }: Flipbook2DemoProps) => {
  const t = useTranslations('Flipbook2Page');
  const flipRef = useRef<PageFlipHandle | null>(null);
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const persistentContentRef = useRef<Record<string, string>>({});

  const pageText = useMemo(
    () => t.raw('pages') as Flipbook2PagesCopy,
    [t],
  );

  const bulletList = useMemo(
    () => (t.raw('bullets') as string[]) ?? [],
    [t],
  );

  const pageDefinitions = useMemo<PageDescriptor[]>(() => ([
    { id: 'cover-front', type: 'cover', density: 'hard' },
    { id: 'intro', type: 'intro' },
    { id: 'controls', type: 'controls' },
    { id: 'gratitude', type: 'gratitude', editable: true },
    { id: 'notes', type: 'notes', editable: true },
    { id: 'free', type: 'free', editable: true },
    { id: 'summary', type: 'summary' },
    { id: 'cover-back', type: 'back', density: 'hard' },
  ]), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const next: Record<string, string> = {};
    pageDefinitions.forEach((page) => {
      if (!page.editable) {
        return;
      }
      next[page.id] = window.localStorage.getItem(storageKey(page.id)) ?? '';
    });
    persistentContentRef.current = next;
    Object.entries(editorRefs.current).forEach(([pageId, node]) => {
      if (!node) {
        return;
      }
      const value = next[pageId] ?? '';
      node.textContent = value;
      node.dataset.hasContent = value.trim() ? 'true' : 'false';
    });
  }, [pageDefinitions]);

  useEffect(() => {
    const handleKeyNavigation = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || focusableTags.has(target.tagName))) {
        return;
      }

      const instance = flipRef.current?.pageFlip?.();
      if (!instance) {
        return;
      }

      event.preventDefault();
      if (event.key === 'ArrowLeft') {
        instance.flipPrev('top');
      } else {
        instance.flipNext('top');
      }
    };

    window.addEventListener('keydown', handleKeyNavigation);
    return () => window.removeEventListener('keydown', handleKeyNavigation);
  }, []);

  const flipUsing = useCallback((direction: 'prev' | 'next') => {
    const instance = flipRef.current?.pageFlip?.();
    if (!instance) {
      return;
    }
    if (direction === 'prev') {
      instance.flipPrev('top');
    } else {
      instance.flipNext('top');
    }
  }, []);

  const handleButtonPrev = useCallback(() => flipUsing('prev'), [flipUsing]);
  const handleButtonNext = useCallback(() => flipUsing('next'), [flipUsing]);

  const handleEditableInput = useCallback((pageId: string, event: FormEvent<HTMLDivElement>) => {
    const editor = event.currentTarget;
    const value = editor.textContent ?? '';
    editor.dataset.hasContent = value.trim() ? 'true' : 'false';
    persistentContentRef.current[pageId] = value;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey(pageId), value);
    }
  }, []);

  const registerEditor = useCallback((pageId: string) => (node: HTMLDivElement | null) => {
    if (!node) {
      delete editorRefs.current[pageId];
      return;
    }
    editorRefs.current[pageId] = node;
    const value = persistentContentRef.current[pageId] ?? '';
    node.textContent = value;
    node.dataset.hasContent = value.trim() ? 'true' : 'false';
  }, []);

  const renderBody = useCallback((body?: string[]) => {
    if (!body?.length) {
      return null;
    }
    return (
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        {body.map((paragraph, index) => (
          <p key={`${paragraph}-${index.toString()}`}>{paragraph}</p>
        ))}
      </div>
    );
  }, []);

  const pageCount = pageDefinitions.length;

  return (
    <div className="flipbook2-stage rounded-3xl border border-white/10">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <section className="flex w-full flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_80px_rgba(5,3,10,0.45)] backdrop-blur">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">{t('badge')}</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">{t('title')}</h2>
            <p className="text-sm text-white/80">{t('description')}</p>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">{t('keyboard_hint')}</p>
              <p className="text-xs text-white/70">{t('keyboard_secondary')}</p>
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              {bulletList.map(entry => (
                <li key={entry} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-300" />
                  <span>{entry}</span>
                </li>
              ))}
            </ul>
          </div>

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
        </section>

        <div className="flex w-full flex-1 items-stretch">
          <div className="flipbook2-viewer">
            <FocusSafeHTMLFlipBook
              ref={(instance) => {
                flipRef.current = instance;
              }}
              className="flipbook2-book"
              width={460}
              height={620}
              minWidth={320}
              maxWidth={820}
              minHeight={420}
              maxHeight={920}
              size="stretch"
              drawShadow
              maxShadowOpacity={0.45}
              showCover
              usePortrait
              useMouseEvents={false}
              clickEventForward
              disableFlipByClick
              mobileScrollSupport
              swipeDistance={900}
              renderOnlyPageLengthChange
            >
              {pageDefinitions.map((page) => {
                const baseClass = cn(
                  'flipbook2-page',
                  page.type === 'cover' && 'flipbook2-page--cover',
                  page.type === 'back' && 'flipbook2-page--back',
                  page.editable && 'flipbook2-page--editable',
                );

                let content: ReactNode = null;

                if (page.type === 'cover') {
                  content = (
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-white/60">{t('badge')}</p>
                        <h3 className="text-4xl font-bold tracking-tight text-white">{pageText.cover.title}</h3>
                        <p className="mt-3 text-base text-white/80">{pageText.cover.subtitle}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{pageText.cover.footnote}</p>
                    </div>
                  );
                } else if (page.type === 'intro') {
                  content = (
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-amber-600">{t('badge')}</p>
                      <h3 className="text-2xl font-semibold text-slate-900">{pageText.intro.heading}</h3>
                      {renderBody(pageText.intro.body)}
                    </div>
                  );
                } else if (page.type === 'controls') {
                  content = (
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-amber-600">{t('badge')}</p>
                      <h3 className="text-2xl font-semibold text-slate-900">{pageText.controls.heading}</h3>
                      {renderBody(pageText.controls.body)}
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-xs text-amber-900">
                        {t('keyboard_hint')}
                      </div>
                    </div>
                  );
                } else if (page.type === 'summary') {
                  content = (
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t('badge')}</p>
                      <h3 className="text-2xl font-semibold text-slate-900">{pageText.summary.heading}</h3>
                      {renderBody(pageText.summary.body)}
                    </div>
                  );
                } else if (page.type === 'back') {
                  content = (
                    <div className="flex h-full flex-col items-center justify-center text-center text-white">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/60">{t('badge')}</p>
                      <h3 className="mt-4 text-3xl font-semibold">{pageText.back.title}</h3>
                      <p className="text-sm text-white/80">{pageText.back.subtitle}</p>
                    </div>
                  );
                } else if (page.type === 'gratitude' || page.type === 'notes' || page.type === 'free') {
                  const target = pageText[page.type];
                  content = (
                    <div className="flex h-full flex-col gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{target.heading}</p>
                        <h3 className="text-2xl font-semibold text-slate-900">{target.subheading}</h3>
                      </div>
                      <div
                        role="textbox"
                        tabIndex={0}
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        aria-label={target.subheading}
                        className="flipbook2-editor"
                        data-placeholder={target.placeholder}
                        data-has-content="false"
                        ref={registerEditor(page.id)}
                        onInput={event => handleEditableInput(page.id, event)}
                      />
                    </div>
                  );
                }

                return (
                  <section
                    key={page.id}
                    data-density={page.density}
                    className={baseClass}
                  >
                    {content}
                  </section>
                );
              })}
            </FocusSafeHTMLFlipBook>

            <div
              className="flipbook2-controls"
              role="group"
              aria-label={t('controls_panel.title')}
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">{t('controls_panel.title')}</p>
                <p className="text-xs text-white/70">{t('controls_panel.description')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flipbook2-control"
                  onClick={handleButtonPrev}
                  aria-label={t('controls_panel.previous')}
                >
                  <span aria-hidden="true">←</span>
                  <span>{t('controls_panel.previous')}</span>
                </button>
                <button
                  type="button"
                  className="flipbook2-control"
                  onClick={handleButtonNext}
                  aria-label={t('controls_panel.next')}
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

export { Flipbook2Demo };
