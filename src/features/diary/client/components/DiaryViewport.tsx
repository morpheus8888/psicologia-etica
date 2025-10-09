'use client';

import { Link2, Settings2 } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import type { TranslationAdapter, UIAdapter } from '@/features/diary/adapters/types';
import { useDiaryData } from '@/features/diary/client/context/DiaryDataContext';
import { useDiaryNavigation } from '@/features/diary/client/context/DiaryNavigationContext';

import { DiaryCoachDock } from './DiaryCoachDock';
import { DiaryGoalLinkPanel } from './DiaryGoalLinkPanel';
import { DiarySharePanel } from './DiarySharePanel';

const formatDateLabel = (dateISO: string, locale: string) => {
  const [yearStr, monthStr, dayStr] = dateISO.split('-');
  const year = Number.parseInt(yearStr ?? '0', 10) || 0;
  const month = Number.parseInt(monthStr ?? '1', 10) || 1;
  const day = Number.parseInt(dayStr ?? '1', 10) || 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const isEntryEditable = (
  dateISO: string,
  todayISO: string,
  graceMinutes: number | null,
  nowISO: string,
) => {
  if (dateISO === todayISO) {
    return true;
  }

  if (!graceMinutes || graceMinutes <= 0) {
    return false;
  }

  const target = new Date(`${dateISO}T23:59:59Z`).getTime();
  const now = new Date(nowISO).getTime();
  const diffMinutes = Math.abs(target - now) / 60000;
  return diffMinutes <= graceMinutes;
};

type DiaryViewportProps = {
  locale: string;
  todayISO: string;
  nowISO: string;
  t: TranslationAdapter;
  ui: UIAdapter;
  coachEnabled: boolean;
  promptLocaleFallback: string;
  coachScope?: string;
  coachTags?: string[];
};

type DayPage = {
  kind: 'day';
  index: number;
  dateISO: string;
};

type GoalsPage = {
  kind: 'goals';
  index: number;
};

type OverviewPage = {
  kind: 'overview';
  index: number;
};

type DiaryPage = DayPage | GoalsPage | OverviewPage;

export const DiaryViewport = ({
  locale,
  todayISO,
  nowISO,
  t,
  ui,
  coachEnabled,
  promptLocaleFallback,
  coachScope,
  coachTags,
}: DiaryViewportProps) => {
  const data = useDiaryData();
  const navigation = useDiaryNavigation();

  const [currentBody, setCurrentBody] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [goalLinkOpen, setGoalLinkOpen] = useState(false);

  useEffect(() => {
    if (!navigation.currentDate) {
      return;
    }

    void data.loadEntry(navigation.currentDate).then((entry) => {
      if (!entry) {
        setCurrentBody('');
        setCurrentEntryId(null);
        setCurrentMood(null);
        return;
      }

      setCurrentBody(entry.content.body);
      setCurrentEntryId(entry.record.id);
      setCurrentMood(entry.record.mood ?? null);
    });
  }, [data, navigation.currentDate]);

  useEffect(() => {
    void data.loadGoals();
  }, [data]);

  useEffect(() => {
    if (!shareOpen) {
      return;
    }
    void data.refreshProfessionals();
  }, [data, shareOpen]);

  const handleSaveEntry = async () => {
    if (!navigation.currentDate) {
      return null;
    }

    const saved = await data.saveEntry({
      dateISO: navigation.currentDate,
      content: {
        body: currentBody,
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
      },
      mood: currentMood,
      tzAtEntry: data.profile?.timezone ?? null,
    });

    setCurrentEntryId(saved.record.id);
    return saved;
  };

  const pages = navigation.pages as DiaryPage[];
  const isDesktop = ui.isDesktop();

  const goals = useMemo(() => Array.from(data.goals.values()), [data.goals]);
  const currentMeta = navigation.currentDate ? data.entryMeta.get(navigation.currentDate) : null;
  const sharedProfessionalIds = currentMeta?.sharedProfessionalIds ?? [];
  const linkedGoalIds = currentMeta?.goalIds ?? [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t.getNamespace('header').t('title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.getNamespace('header').t('subtitle', { date: formatDateLabel(todayISO, locale) })}
            </p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-border/70 bg-background px-2 py-1 text-sm">
            {pages.map(page => (
              <button
                key={page.kind === 'day' ? page.dateISO : page.kind}
                type="button"
                onClick={() => navigation.setIndex(page.index)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  page.index === navigation.currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {page.kind === 'goals' && t.getNamespace('nav').t('goals')}
                {page.kind === 'overview' && t.getNamespace('nav').t('overview')}
                {page.kind === 'day' && formatDateLabel(page.dateISO, locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
          <div className="relative">
            {pages.map((page) => {
              const isActive = page.index === navigation.currentIndex;
              let dayView: ReactNode | null = null;

              if (page.kind === 'day') {
                const editable = isEntryEditable(
                  page.dateISO,
                  todayISO,
                  data.diaryGraceMinutes,
                  nowISO,
                );
                const hasDeadlineForPage = goals.some(
                  goal => goal.content.deadlineISO === page.dateISO,
                );
                const disableShare = !navigation.currentDate || (!currentEntryId && !editable);
                const disableGoalLink = !navigation.currentDate || (!currentEntryId && !editable);

                dayView = (
                  <div className="space-y-4">
                    {hasDeadlineForPage && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 size-2 shrink-0 rounded-full bg-amber-600" />
                            <div>
                              <p className="font-semibold">
                                {t.getNamespace('entry').t('deadlineTodayTitle')}
                              </p>
                              <p className="mt-1 text-xs text-amber-700/80">
                                {t.getNamespace('entry').t('deadlineTodaySubtitle')}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-amber-600/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-500/30"
                            onClick={() => setGoalLinkOpen(true)}
                          >
                            {t.getNamespace('entry').t('deadlineCta')}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {formatDateLabel(page.dateISO, locale)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {editable
                            ? t.getNamespace('entry').t('editable')
                            : t.getNamespace('entry').t('readonly')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={currentMood ?? ''}
                          onChange={event => setCurrentMood(event.target.value || null)}
                          className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                          disabled={!editable}
                        >
                          <option value="">{t.getNamespace('entry').t('moodPlaceholder')}</option>
                          <option value="positive">
                            😊
                            {t.getNamespace('entry').t('moodPositive')}
                          </option>
                          <option value="neutral">
                            😐
                            {t.getNamespace('entry').t('moodNeutral')}
                          </option>
                          <option value="negative">
                            😞
                            {t.getNamespace('entry').t('moodNegative')}
                          </option>
                        </select>
                        {data.professionals.length > 0
                        && ui.iconButton({
                          icon: <Settings2 className="size-4" />,
                          label: t.getNamespace('entry').t('share'),
                          variant: 'ghost',
                          disabled: disableShare,
                          onClick: async () => {
                            if (!navigation.currentDate) {
                              return;
                            }

                            let entryId = currentEntryId;
                            if (!entryId) {
                              if (!editable) {
                                return;
                              }

                              const saved = await handleSaveEntry();
                              entryId = saved?.record.id ?? null;
                              if (!entryId) {
                                return;
                              }
                              setCurrentEntryId(entryId);
                            }

                            setShareOpen(true);
                          },
                        })}
                        {goals.length > 0
                        && ui.iconButton({
                          icon: <Link2 className="size-4" />,
                          label: t.getNamespace('entry').t('linkGoal'),
                          variant: 'ghost',
                          disabled: disableGoalLink,
                          onClick: async () => {
                            if (!navigation.currentDate) {
                              return;
                            }

                            let entryId = currentEntryId;
                            if (!entryId) {
                              if (!editable) {
                                return;
                              }

                              const saved = await handleSaveEntry();
                              entryId = saved?.record.id ?? null;
                              if (!entryId) {
                                return;
                              }
                              setCurrentEntryId(entryId);
                            }

                            setGoalLinkOpen(true);
                          },
                        })}
                      </div>
                    </div>

                    <textarea
                      value={currentBody}
                      onChange={event => setCurrentBody(event.target.value)}
                      className="h-64 w-full resize-none rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      placeholder={t.getNamespace('entry').t('placeholder')}
                      disabled={!editable}
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          void handleSaveEntry();
                        }}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        disabled={!editable}
                      >
                        {t.getNamespace('entry').t('save')}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={page.kind === 'day' ? page.dateISO : page.kind}
                  className={`transition-opacity duration-300 ${
                    isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
                  } ${page.kind === 'day' ? 'p-6' : 'p-6 md:p-8'}`}
                >
                  {page.kind === 'goals'
                    ? (
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-foreground">
                            {t.getNamespace('goals').t('title')}
                          </h3>
                          {goals.length === 0
                            ? (
                                <p className="text-sm text-muted-foreground">
                                  {t.getNamespace('goals').t('empty')}
                                </p>
                              )
                            : (
                                <ul className="space-y-3">
                                  {goals.map(goal => (
                                    <li
                                      key={goal.record.id}
                                      className={`rounded-xl border border-border/60 bg-muted/20 p-4 text-left ${
                                        goal.content.deadlineISO && goal.content.deadlineISO === todayISO
                                          ? 'border-primary shadow-primary/20'
                                          : ''
                                      }`}
                                    >
                                      <p className="text-sm font-semibold text-foreground">{goal.content.title}</p>
                                      {goal.content.description && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {goal.content.description}
                                        </p>
                                      )}
                                      {goal.content.deadlineISO && (
                                        <p className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                          {t
                                            .getNamespace('goals')
                                            .t('deadline', {
                                              date: formatDateLabel(goal.content.deadlineISO, locale),
                                            })}
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                        </div>
                      )
                    : null}

                  {page.kind === 'overview'
                    ? (
                        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
                          <div className="space-y-4">
                            <h3 className="text-base font-semibold text-foreground">
                              {t.getNamespace('overview').t('calendarTitle')}
                            </h3>
                            {ui.calendar({
                              selectedDate: navigation.currentDate ? new Date(navigation.currentDate) : null,
                              onSelect: (date) => {
                                if (date) {
                                  const iso = date.toISOString().slice(0, 10);
                                  navigation.setDate(iso);
                                }
                              },
                              locale,
                              highlightedDates: Array.from(data.entryMeta.keys()),
                            })}
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-base font-semibold text-foreground">
                              {t.getNamespace('overview').t('heatmapTitle')}
                            </h3>
                            {ui.heatmap({
                              data: Array.from(data.entryMeta.values()).map(item => ({
                                dateISO: item.dateISO,
                                value: item.wordCount ?? 0,
                              })),
                              onSelect: dateISO => navigation.setDate(dateISO),
                              locale,
                            })}
                          </div>
                        </div>
                      )
                    : null}

                  {page.kind === 'day' ? dayView : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {navigation.currentDate && shareOpen
        ? (
            <DiarySharePanel
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              professionals={data.professionals}
              sharedProfessionalIds={sharedProfessionalIds}
              onShare={async (professionalId) => {
                let entryId = currentEntryId;
                if (!entryId) {
                  const saved = await handleSaveEntry();
                  entryId = saved?.record.id ?? null;
                  if (entryId) {
                    setCurrentEntryId(entryId);
                  }
                }

                if (!navigation.currentDate || !entryId) {
                  return;
                }

                await data.shareEntry({
                  entryId,
                  dateISO: navigation.currentDate,
                  professionalId,
                });
              }}
              onRevoke={async (professionalId) => {
                const entryId = currentEntryId;
                if (!entryId || !navigation.currentDate) {
                  return;
                }

                await data.revokeShare({
                  entryId,
                  dateISO: navigation.currentDate,
                  professionalId,
                });
              }}
              t={t.getNamespace('share')}
              ui={ui}
              isDesktop={isDesktop}
            />
          )
        : null}

      {navigation.currentDate && goalLinkOpen
        ? (
            <DiaryGoalLinkPanel
              open={goalLinkOpen}
              onClose={() => setGoalLinkOpen(false)}
              goals={goals}
              linkedGoalIds={linkedGoalIds}
              onLink={async (goalId) => {
                let entryId = currentEntryId;
                if (!entryId) {
                  const saved = await handleSaveEntry();
                  entryId = saved?.record.id ?? null;
                  if (entryId) {
                    setCurrentEntryId(entryId);
                  }
                }

                if (!navigation.currentDate || !entryId) {
                  return;
                }

                await data.linkGoal({
                  goalId,
                  entryId,
                  dateISO: navigation.currentDate,
                });
              }}
              onUnlink={async (goalId) => {
                const entryId = currentEntryId;
                if (!entryId || !navigation.currentDate) {
                  return;
                }

                await data.unlinkGoal({
                  goalId,
                  entryId,
                  dateISO: navigation.currentDate,
                });
              }}
              t={t.getNamespace('goals').getNamespace('linker')}
              ui={ui}
              isDesktop={isDesktop}
              locale={locale}
            />
          )
        : null}

      {coachEnabled
        ? (
            <DiaryCoachDock
              locale={locale}
              promptLocaleFallback={promptLocaleFallback}
              scope={coachScope}
              tags={coachTags}
              onInsertPrompt={text => setCurrentBody(prev => `${prev}\n\n${text}`.trim())}
              t={t.getNamespace('coach')}
              ui={ui}
            />
          )
        : null}
    </>
  );
};
