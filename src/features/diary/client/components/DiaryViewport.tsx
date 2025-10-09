'use client';

import { CalendarDays, Link2, Settings2, Target } from 'lucide-react';
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import HTMLFlipBook from 'react-pageflip';

import type { TranslationAdapter, UIAdapter } from '@/features/diary/adapters/types';
import { useDiaryData } from '@/features/diary/client/context/DiaryDataContext';
import { useDiaryNavigation } from '@/features/diary/client/context/DiaryNavigationContext';

import { DiaryCoachDock } from './DiaryCoachDock';
import { DiaryGoalLinkPanel } from './DiaryGoalLinkPanel';
import { DiarySharePanel } from './DiarySharePanel';

const FlipBook = HTMLFlipBook as unknown as ComponentType<any>;

const GOALS_LEFT_INDEX = 2;
const CALENDAR_LEFT_INDEX = 4;
const BASE_PAGE_COUNT = 6;

const normalizeDate = (dateISO: string) => dateISO.slice(0, 10);

const toISODate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);

const buildCalendarGrid = (
  anchor: Date,
  entryDates: Set<string>,
  todayISO: string,
) => {
  const start = startOfMonth(anchor);
  const startWeekday = (start.getDay() + 6) % 7; // monday-first
  const firstVisible = new Date(start);
  firstVisible.setDate(start.getDate() - startWeekday);

  const cells: {
    dateISO: string;
    label: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    hasEntry: boolean;
  }[] = [];

  for (let i = 0; i < 42; i += 1) {
    const current = new Date(firstVisible);
    current.setDate(firstVisible.getDate() + i);
    const dateISO = toISODate(current);
    cells.push({
      dateISO,
      label: current.getDate(),
      isCurrentMonth: current.getMonth() === anchor.getMonth(),
      isToday: dateISO === todayISO,
      hasEntry: entryDates.has(dateISO),
    });
  }

  return cells;
};

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

  const flipRef = useRef<any>(null);
  const [currentBody, setCurrentBody] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [goalLinkOpen, setGoalLinkOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(`${todayISO}T00:00:00`));
  const [calendarSelection, setCalendarSelection] = useState(() => navigation.currentDate ?? todayISO);

  const isDesktop = ui.isDesktop();

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

  useEffect(() => {
    if (navigation.currentDate) {
      setCalendarSelection(navigation.currentDate);
      setCalendarMonth(new Date(`${navigation.currentDate}T00:00:00`));
    }
  }, [navigation.currentDate]);

  useEffect(() => {
    const book = flipRef.current?.pageFlip?.();
    if (!book) {
      return;
    }

    const currentPage = book.getCurrentPageIndex();
    if (currentPage !== navigation.currentIndex) {
      book.flip(navigation.currentIndex);
    }
  }, [navigation.currentIndex]);

  const handleFlip = useCallback(
    (event: { data: number }) => {
      const nextIndex = event.data;
      if (navigation.currentIndex !== nextIndex) {
        navigation.setIndex(nextIndex);
      }
    },
    [navigation],
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (navigation.currentIndex !== index) {
        navigation.setIndex(index);
      }
      const book = flipRef.current?.pageFlip?.();
      if (book) {
        book.flip(index);
      }
    },
    [navigation],
  );

  const handleSaveEntry = useCallback(async () => {
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
  }, [currentBody, currentMood, data, navigation.currentDate]);

  const goals = useMemo(() => Array.from(data.goals.values()), [data.goals]);
  const entryMetaMap = data.entryMeta;
  const currentMeta = navigation.currentDate ? entryMetaMap.get(navigation.currentDate) : null;
  const sharedProfessionalIds = currentMeta?.sharedProfessionalIds ?? [];
  const linkedGoalIds = currentMeta?.goalIds ?? [];

  const entryDatesSet = useMemo(() => {
    return new Set(Array.from(entryMetaMap.values(), item => item.dateISO));
  }, [entryMetaMap]);

  const calendarCells = useMemo(() => {
    return buildCalendarGrid(calendarMonth, entryDatesSet, todayISO);
  }, [calendarMonth, entryDatesSet, todayISO]);

  const dayPages = useMemo(
    () => navigation.pages.filter(page => page.kind === 'day'),
    [navigation.pages],
  );

  const upcomingDeadlines = useMemo(() => {
    const today = new Date(`${todayISO}T00:00:00`);
    return goals
      .filter(goal => goal.content.deadlineISO)
      .map(goal => ({
        id: goal.record.id,
        title: goal.content.title,
        deadlineISO: goal.content.deadlineISO!,
        daysLeft: Math.ceil(
          (new Date(`${goal.content.deadlineISO}T00:00:00`).getTime() - today.getTime())
          / (1000 * 60 * 60 * 24),
        ),
      }))
      .sort((a, b) => (a.deadlineISO < b.deadlineISO ? -1 : 1))
      .slice(0, 4);
  }, [goals, todayISO]);

  const handleCalendarSelect = useCallback(
    (dateISO: string) => {
      const normalized = normalizeDate(dateISO);
      const targetPage = dayPages.find(page => page.dateISO === normalized);
      setCalendarSelection(normalized);
      setCalendarMonth(new Date(`${normalized}T00:00:00`));
      navigation.setDate(normalized);
      goToIndex(targetPage?.index ?? BASE_PAGE_COUNT);
    },
    [dayPages, goToIndex, navigation],
  );

  const handleGoToday = useCallback(() => {
    setCalendarSelection(todayISO);
    setCalendarMonth(new Date(`${todayISO}T00:00:00`));
    goToIndex(CALENDAR_LEFT_INDEX);
  }, [goToIndex, todayISO]);

  useEffect(() => {
    goals.forEach((goal) => {
      if (goal.content.deadlineISO) {
        navigation.appendDate(goal.content.deadlineISO);
      }
    });
  }, [goals, navigation]);

  if (!isDesktop) {
    return (
      <div className="rounded-2xl border border-border/60 bg-background p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          {t.getNamespace('header').t('title')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.getNamespace('nav').t('desktopOnly')}
        </p>
      </div>
    );
  }

  const basePageClass = 'page diary-page flex h-full flex-col p-8';

  const coverLeftPage = (
    <article key="cover-left" className={`${basePageClass} diary-page--cover-left`}>
      <div className="flex h-full flex-col justify-end gap-6">
        <div className="space-y-3 text-left text-muted-foreground/90">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
            Psicologia Etica
          </p>
          <h1 className="text-4xl font-semibold text-foreground">Diario Riservato</h1>
          <p className="max-w-xs text-sm leading-relaxed">
            Un luogo sicuro per annotare giornate, progressi e obiettivi condivisi con il tuo
            professionista di fiducia.
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-background/70 px-5 py-4 text-xs uppercase tracking-widest text-muted-foreground">
          {t.getNamespace('header').t('subtitle', { date: formatDateLabel(todayISO, locale) })}
        </div>
      </div>
    </article>
  );

  const coverRightPage = (
    <article key="cover-right" className={`${basePageClass} diary-page--cover-right`}>
      <div className="flex h-full flex-col items-center justify-center text-center text-primary-foreground/90">
        <p className="text-sm uppercase tracking-[0.35em]">Psicologia Etica</p>
        <h2 className="mt-4 text-4xl font-bold">Private Journal</h2>
        <p className="mt-6 max-w-xs text-sm leading-relaxed">
          Protezione end-to-end, controllo totale dell&apos;accesso, strumenti pensati per il percorso
          terapeutico.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs uppercase tracking-widest">
          <span>{locale.toUpperCase()}</span>
          <span className="h-3 w-px bg-primary-foreground/40" />
          <span>{todayISO}</span>
        </div>
      </div>
    </article>
  );

  const goalsLeftPage = (
    <article key="goals-left" className={`${basePageClass} diary-page--goals`}>
      <div className="flex h-full flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Target className="size-6 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.getNamespace('goals').t('title')}
              </p>
              <h3 className="text-2xl font-semibold text-foreground">
                {t.getNamespace('header').t('title')}
              </h3>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.getNamespace('share').t('subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.getNamespace('goals').t('title')}
            </p>
            <p className="text-2xl font-semibold text-foreground">{goals.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.getNamespace('nav').t('today')}
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {formatDateLabel(todayISO, locale)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );

  const goalsRightPage = (
    <article key="goals-right" className={`${basePageClass} diary-page--goals`}>
      <div className="flex h-full flex-col gap-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t.getNamespace('goals').t('title')}
        </h3>
        {goals.length === 0
          ? (
              <p className="rounded-xl border border-dashed border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
                {t.getNamespace('goals').t('empty')}
              </p>
            )
          : (
              <ul className="space-y-3 overflow-y-auto">
                {goals.map(goal => (
                  <li
                    key={goal.record.id}
                    className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {goal.content.title || t.getNamespace('goals').t('title')}
                    </p>
                    {goal.content.description && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {goal.content.description}
                      </p>
                    )}
                    {goal.content.deadlineISO && (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <CalendarDays className="size-3" />
                        {t.getNamespace('goals').t('deadline', {
                          date: formatDateLabel(goal.content.deadlineISO, locale),
                        })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
      </div>
    </article>
  );

  const calendarLeftPage = (
    <article key="calendar-left" className={`${basePageClass} diary-page--calendar`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.getNamespace('nav').t('calendar')}
            </p>
            <h3 className="text-2xl font-semibold text-foreground">
              {calendarMonth.toLocaleDateString(locale, {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleGoToday}
            className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            {t.getNamespace('nav').t('today')}
          </button>
        </div>
        <div className="mt-4 grid w-full grid-cols-7 gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(label => (
            <span key={label} className="text-center">
              {label}
            </span>
          ))}
        </div>
        <div className="mt-2 grid flex-1 grid-cols-7 gap-2 text-sm">
          {calendarCells.map((cell) => {
            const isSelected = calendarSelection === cell.dateISO;
            const baseClasses = [
              'flex h-16 flex-col items-center justify-center rounded-xl border text-sm transition',
              cell.isCurrentMonth ? 'border-border/60 bg-background' : 'border-dashed border-border/40 bg-muted/20 text-muted-foreground',
              cell.hasEntry ? 'shadow-[0_0_0_1px_rgba(59,130,246,0.35)]' : '',
              isSelected ? 'border-primary bg-primary/10 text-primary' : '',
              cell.isToday && !isSelected ? 'border-primary/60' : '',
            ].join(' ');

            return (
              <button
                key={cell.dateISO}
                type="button"
                onClick={() => handleCalendarSelect(cell.dateISO)}
                className={baseClasses}
              >
                <span className="text-base font-semibold">{cell.label}</span>
                {cell.hasEntry && (
                  <span className="mt-1 h-1.5 w-8 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );

  const calendarRightPage = (
    <article key="calendar-right" className={`${basePageClass} diary-page--calendar`}>
      <div className="flex h-full flex-col gap-4">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {t.getNamespace('overview').t('heatmapTitle')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t.getNamespace('overview').t('calendarTitle')}
          </p>
        </header>
        <div className="rounded-xl border border-border/60 bg-background/80 p-4 text-sm">
          <p className="font-semibold text-foreground">
            {t.getNamespace('entry').t('editable')}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t.getNamespace('share').t('toastErrorDescription')}
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            {t.getNamespace('goals').t('title')}
          </h4>
          {upcomingDeadlines.length === 0
            ? (
                <p className="rounded-lg border border-dashed border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
                  {t.getNamespace('goals').t('empty')}
                </p>
              )
            : (
                <ul className="space-y-2 text-sm">
                  {upcomingDeadlines.map(deadline => (
                    <li
                      key={deadline.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                    >
                      <span className="text-foreground">{deadline.title}</span>
                      <span className="text-xs font-semibold text-primary">
                        {formatDateLabel(deadline.deadlineISO, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      </div>
    </article>
  );

  const dayPagesNodes = dayPages.map((page) => {
    const editable = isEntryEditable(
      page.dateISO,
      todayISO,
      data.diaryGraceMinutes,
      nowISO,
    );
    const hasDeadlineForPage = goals.some(goal => goal.content.deadlineISO === page.dateISO);
    const disableShare = !navigation.currentDate || (!currentEntryId && !editable);
    const disableGoalLink = !navigation.currentDate || (!currentEntryId && !editable);

    return (
      <article key={page.dateISO} className={`${basePageClass} diary-page--entry`}>
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {formatDateLabel(page.dateISO, locale)}
              </p>
              <h3 className="text-xl font-semibold text-foreground">
                {editable
                  ? t.getNamespace('entry').t('editable')
                  : t.getNamespace('entry').t('readonly')}
              </h3>
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

          <textarea
            value={navigation.currentDate === page.dateISO ? currentBody : ''}
            onChange={event => setCurrentBody(event.target.value)}
            className="h-72 w-full resize-none rounded-2xl border border-border/70 bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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
      </article>
    );
  });

  const flipPages = [
    coverLeftPage,
    coverRightPage,
    goalsLeftPage,
    goalsRightPage,
    calendarLeftPage,
    calendarRightPage,
    ...dayPagesNodes,
  ];

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToIndex(GOALS_LEFT_INDEX)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                navigation.currentIndex <= 1
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border/60 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {t.getNamespace('nav').t('goals')}
            </button>
            <button
              type="button"
              onClick={() => goToIndex(CALENDAR_LEFT_INDEX)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                navigation.currentIndex === 2 || navigation.currentIndex === 3
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border/60 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {t.getNamespace('nav').t('calendar')}
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="rounded-full border border-border/60 px-3 py-1 text-sm font-medium text-foreground transition hover:bg-muted/60"
            >
              {t.getNamespace('nav').t('today')}
            </button>
            <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-border/70 bg-background px-2 py-1 text-sm">
              {dayPages.map(page => (
                <button
                  key={page.dateISO}
                  type="button"
                  onClick={() => {
                    setCalendarSelection(page.dateISO);
                    setCalendarMonth(new Date(`${page.dateISO}T00:00:00`));
                    navigation.setIndex(page.index);
                    goToIndex(page.index);
                  }}
                  className={`rounded-full px-3 py-1 font-medium transition ${
                    page.index === navigation.currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {formatDateLabel(page.dateISO, locale)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background shadow-sm">
          <FlipBook
            ref={flipRef}
            width={540}
            height={680}
            size="stretch"
            minWidth={420}
            maxWidth={640}
            minHeight={560}
            maxHeight={820}
            startPage={navigation.currentIndex}
            showCover={false}
            drawShadow={false}
            onFlip={handleFlip}
            disableFlipByClick
            showPageCorners
            clickEventForward={false}
            mobileScrollSupport={false}
            className="w-full"
          >
            {flipPages}
          </FlipBook>
        </div>
      </div>

      {navigation.currentDate && shareOpen && (
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
      )}

      {navigation.currentDate && goalLinkOpen && (
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
      )}

      {coachEnabled && (
        <DiaryCoachDock
          locale={locale}
          promptLocaleFallback={promptLocaleFallback}
          scope={coachScope}
          tags={coachTags}
          onInsertPrompt={text => setCurrentBody(prev => `${prev}\n\n${text}`.trim())}
          t={t.getNamespace('coach')}
          ui={ui}
        />
      )}
    </>
  );
};
