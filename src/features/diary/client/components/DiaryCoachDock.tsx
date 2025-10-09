'use client';

import { useEffect, useMemo, useState } from 'react';

import { AvatarBadge } from '@/components/AvatarBadge';
import type { TranslationAdapter, UIAdapter } from '@/features/diary/adapters/types';
import { useDiaryCoach } from '@/features/diary/client/context/DiaryCoachContext';
import { useDiaryData } from '@/features/diary/client/context/DiaryDataContext';

type DiaryCoachDockProps = {
  locale: string;
  promptLocaleFallback: string;
  scope?: string;
  tags?: string[];
  onInsertPrompt: (text: string) => void;
  t: TranslationAdapter;
  ui: UIAdapter;
};

const ANIMATION_INTERVAL = 30_000;
const ASK_TIMEOUT_MS = 45_000;
const SLEEP_TIMEOUT_MS = 90_000;
const WAKE_TIMEOUT_MS = 180_000;

export const DiaryCoachDock = ({
  locale,
  promptLocaleFallback,
  scope,
  tags,
  onInsertPrompt,
  t,
  ui,
}: DiaryCoachDockProps) => {
  const coach = useDiaryCoach();
  const {
    state: coachState,
    prompt: coachPrompt,
    load: loadPrompts,
    pickNext,
    setState: setCoachState,
    lastInteractionAt,
    recordActivity,
  } = coach;
  const data = useDiaryData();
  const [open, setOpen] = useState(false);
  const isDesktop = ui.isDesktop();
  const avatar = data.profile?.avatarAnimal ?? null;

  const localeFilter = useMemo(() => {
    return locale ?? promptLocaleFallback ?? 'it';
  }, [locale, promptLocaleFallback]);

  useEffect(() => {
    void loadPrompts({
      locale: localeFilter,
      scope,
      tags,
    });
  }, [loadPrompts, localeFilter, scope, tags]);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => {
        setCoachState('ask');
        recordActivity();
      }, ANIMATION_INTERVAL);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open, recordActivity, setCoachState]);

  useEffect(() => {
    if (open) {
      recordActivity();
    }
  }, [open, recordActivity]);

  useEffect(() => {
    if (open) {
      return undefined;
    }

    if (coachState === 'ask') {
      const timer = window.setTimeout(() => {
        if (!open) {
          setCoachState('sleep');
        }
      }, SLEEP_TIMEOUT_MS);
      return () => window.clearTimeout(timer);
    }

    const now = Date.now();
    const lastInteraction = lastInteractionAt ?? now;
    const baseDelay = coachState === 'sleep' ? WAKE_TIMEOUT_MS : ASK_TIMEOUT_MS;
    const elapsed = now - lastInteraction;
    const delay = Math.max(baseDelay - elapsed, 0);

    const timer = window.setTimeout(() => {
      if (!open) {
        setCoachState('ask');
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [coachState, lastInteractionAt, open, setCoachState]);

  const prompt = coachPrompt ?? pickNext();

  if (!avatar || !prompt) {
    return null;
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <AvatarBadge avatar={avatar} size="lg" />
        <div className="rounded-2xl border border-border/60 bg-background/95 px-4 py-3 shadow-lg">
          <p className="text-sm text-foreground">{prompt.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">
              {t.t('tags.weight', { value: prompt.weight })}
            </span>
            {prompt.tags.map(tag => (
              <span key={tag} className="rounded-full bg-muted px-2 py-1">
                #
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setCoachState('insert');
            onInsertPrompt(prompt.text);
            recordActivity();
            ui.toast({
              title: t.t('inserted'),
              variant: 'success',
            });
            setOpen(false);
          }}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t.t('actions.insert')}
        </button>
        <button
          type="button"
          onClick={() => {
            pickNext();
            setCoachState('cheer');
            recordActivity();
          }}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
        >
          {t.t('actions.another')}
        </button>
        <button
          type="button"
          onClick={() => {
            setCoachState('sleep');
            recordActivity();
            setOpen(false);
          }}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60"
        >
          {t.t('actions.dismiss')}
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="pointer-events-none fixed bottom-8 right-8 z-40 flex flex-col items-end gap-4">
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="pointer-events-auto rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground shadow hover:bg-muted"
        >
          {t.t(open ? 'close' : 'open')}
        </button>
        {open && <div className="pointer-events-auto">{content}</div>}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full border border-border bg-background p-2 shadow-lg"
      >
        <AvatarBadge avatar={avatar} size="lg" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40">
      <ui.bottomSheet.Content className="rounded-t-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t.t('coach.bottomSheetTitle')}</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
          >
            {t.t('close')}
          </button>
        </div>
        <div className="mt-4">{content}</div>
      </ui.bottomSheet.Content>
    </div>
  );
};
