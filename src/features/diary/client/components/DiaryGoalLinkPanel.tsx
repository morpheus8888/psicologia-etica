'use client';

import { useMemo, useState } from 'react';

import type { TranslationAdapter, UIAdapter } from '@/features/diary/adapters/types';
import type { DiaryGoalState } from '@/features/diary/client/context/DiaryDataContext';

type DiaryGoalLinkPanelProps = {
  open: boolean;
  onClose: () => void;
  goals: DiaryGoalState[];
  linkedGoalIds: string[];
  onLink: (goalId: string) => Promise<void>;
  onUnlink: (goalId: string) => Promise<void>;
  t: TranslationAdapter;
  ui: UIAdapter;
  isDesktop: boolean;
  locale: string;
};

export const DiaryGoalLinkPanel = ({
  open,
  onClose,
  goals,
  linkedGoalIds,
  onLink,
  onUnlink,
  t,
  ui,
  isDesktop,
  locale,
}: DiaryGoalLinkPanelProps) => {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const linkedSet = useMemo(() => new Set(linkedGoalIds), [linkedGoalIds]);

  if (!open) {
    return null;
  }

  const handleToggle = async (goalId: string, alreadyLinked: boolean) => {
    setPendingId(goalId);
    try {
      if (alreadyLinked) {
        await onUnlink(goalId);
      } else {
        await onLink(goalId);
      }
    } finally {
      setPendingId(null);
    }
  };

  const Panel = isDesktop ? ui.dialog.Content : ui.bottomSheet.Content;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-10 md:items-center md:px-0">
      <Panel className="w-full max-w-xl rounded-2xl border border-border/50 bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t.t('title')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/60"
          >
            {t.t('close')}
          </button>
        </div>

        {goals.length === 0
          ? (
              <p className="mt-6 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
                {t.t('empty')}
              </p>
            )
          : (
              <ul className="mt-6 space-y-3">
                {goals.map((goal) => {
                  const alreadyLinked = linkedSet.has(goal.record.id);
                  const deadlineLabel = goal.content.deadlineISO
                    ? t.t('deadline', {
                      date: new Date(goal.content.deadlineISO).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }),
                    })
                    : null;
                  const pending = pendingId === goal.record.id;

                  return (
                    <li
                      key={goal.record.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{goal.content.title}</p>
                        {goal.content.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{goal.content.description}</p>
                        )}
                        {deadlineLabel && (
                          <p className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-wide text-primary">
                            {deadlineLabel}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void handleToggle(goal.record.id, alreadyLinked)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          alreadyLinked
                            ? 'border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20'
                            : 'border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                        } ${pending ? 'opacity-60' : ''}`}
                      >
                        {pending
                          ? t.t('pending')
                          : alreadyLinked
                            ? t.t('unlink')
                            : t.t('link')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
      </Panel>
    </div>
  );
};
