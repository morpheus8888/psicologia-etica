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
  const data = useDiaryData();
  const [open, setOpen] = useState(false);
  const isDesktop = ui.isDesktop();
  const avatar = data.profile?.avatarAnimal ?? null;

  const localeFilter = useMemo(() => {
    return locale ?? promptLocaleFallback ?? 'it';
  }, [locale, promptLocaleFallback]);

  useEffect(() => {
    void coach.load({
      locale: localeFilter,
      scope,
      tags,
    });
  }, [coach, localeFilter, scope, tags]);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => {
        coach.setState('ask');
      }, ANIMATION_INTERVAL);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [coach, open]);

  useEffect(() => {
    if (!open && coach.state === 'ask') {
      const timer = window.setTimeout(() => {
        coach.setState('sleep');
      }, ANIMATION_INTERVAL);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [coach, open]);

  const prompt = coach.prompt ?? coach.pickNext();

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
            coach.setState('insert');
            onInsertPrompt(prompt.text);
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
            coach.pickNext();
            coach.setState('cheer');
          }}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
        >
          {t.t('actions.another')}
        </button>
        <button
          type="button"
          onClick={() => {
            coach.setState('sleep');
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
