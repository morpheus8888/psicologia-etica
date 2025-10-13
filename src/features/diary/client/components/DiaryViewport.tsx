'use client';

import { CalendarDays, Link2, Settings2, Target } from 'lucide-react';
import {
  type ComponentType,
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import HTMLFlipBook from 'react-pageflip';

import type { TranslationAdapter, UIAdapter } from '@/features/diary/adapters/types';
import { useDiaryData } from '@/features/diary/client/context/DiaryDataContext';
import { useDiaryEncryption } from '@/features/diary/client/context/DiaryEncryptionContext';
import { useDiaryNavigation } from '@/features/diary/client/context/DiaryNavigationContext';
import { resolveDiaryTimezone } from '@/features/diary/feature/resolveTimezone';

import { DiaryCoachDock } from './DiaryCoachDock';
import { DiaryEntryEditor } from './DiaryEntryEditor';
import { DiaryGoalLinkPanel } from './DiaryGoalLinkPanel';
import { DiarySharePanel } from './DiarySharePanel';

const FlipBook = HTMLFlipBook as unknown as ComponentType<any>;
const PAGE_EDGE_WIDTH_CLASS = 'w-16'; // 64px edge activation zones

type PageFlipApi = {
  update: () => void;
  updateFromHtml?: (items: NodeListOf<HTMLElement> | HTMLElement[]) => void;
  getUI: () => {
    getDistElement: () => HTMLElement;
  };
  getCurrentPageIndex: () => number;
  flip: (pageIndex: number, corner?: unknown) => void;
  turnToPage: (pageIndex: number) => void;
};

type FlipBookHandle = {
  pageFlip: () => (PageFlipApi & { ui?: unknown }) | undefined;
};

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
  const date = new Date(year, month - 1, day);
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

const computeConsecutiveStreak = (todayISO: string, entryDates: Set<string>) => {
  let streak = 0;
  const cursor = new Date(`${todayISO}T00:00:00`);

  while (true) {
    const iso = toISODate(cursor);
    if (!entryDates.has(iso)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const FONT_OPTIONS = [
  { id: 'sans', className: 'diary-entry-font-sans' },
  { id: 'serif', className: 'diary-entry-font-serif' },
  { id: 'mono', className: 'diary-entry-font-mono' },
] as const;

const COLOR_OPTIONS = [
  { id: 'ink', className: 'diary-entry-color-ink' },
  { id: 'sepia', className: 'diary-entry-color-sepia' },
  { id: 'ocean', className: 'diary-entry-color-ocean' },
] as const;

type EntryFontValue = typeof FONT_OPTIONS[number]['id'];
type EntryColorValue = typeof COLOR_OPTIONS[number]['id'];

type DiaryEntryStyle = {
  font: EntryFontValue;
  color: EntryColorValue;
};

const ENTRY_EDITOR_DEFAULT_STYLE: DiaryEntryStyle = {
  font: FONT_OPTIONS[0].id,
  color: COLOR_OPTIONS[0].id,
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

type ProgressSectionProps = {
  t: TranslationAdapter;
  locale: string;
  todayISO: string;
  calendarMonth: Date;
  entryDatesSet: Set<string>;
};

const ProgressSection = ({
  t,
  locale,
  todayISO,
  calendarMonth,
  entryDatesSet,
}: ProgressSectionProps) => {
  const streak = useMemo(
    () => computeConsecutiveStreak(todayISO, entryDatesSet),
    [todayISO, entryDatesSet],
  );

  const totalEntries = entryDatesSet.size;
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();

  const monthEntriesCount = useMemo(() => {
    return Array.from(entryDatesSet).filter((dateISO) => {
      const [yStr, mStr] = dateISO.split('-');
      const yearValue = Number.parseInt(yStr ?? '0', 10);
      const monthValue = (Number.parseInt(mStr ?? '1', 10) || 1) - 1;
      return yearValue === calendarYear && monthValue === calendarMonthIndex;
    }).length;
  }, [entryDatesSet, calendarMonthIndex, calendarYear]);

  const monthLabel = useMemo(
    () => calendarMonth.toLocaleDateString(locale, { month: 'long' }),
    [calendarMonth, locale],
  );

  const monthProgress
    = daysInMonth > 0 ? Math.min((monthEntriesCount / daysInMonth) * 100, 100) : 0;

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-4 text-sm shadow-sm">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          {t.getNamespace('overview').t('progressTitle')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t.getNamespace('overview').t('progressSubtitle')}
        </p>
      </header>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {t.getNamespace('overview').t('progressStreak', { count: streak })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t.getNamespace('overview').t('progressTotal', { count: totalEntries })}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t.getNamespace('overview').t('progressMonthLabel', {
              month: monthLabel,
              count: monthEntriesCount,
            })}
          </span>
          <span className="font-medium text-foreground">
            {monthEntriesCount}
            {' '}
            /
            {daysInMonth}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${monthProgress}%` }}
          />
        </div>
      </div>
    </section>
  );
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
  const tCover = t.getNamespace('cover');
  const tClosing = t.getNamespace('closing');
  const entryNamespace = useMemo(() => t.getNamespace('entry'), [t]);
  const entryDebugNamespace = useMemo(
    () => entryNamespace.getNamespace('debug'),
    [entryNamespace],
  );
  const entryEditorNamespace = useMemo(
    () => entryNamespace.getNamespace('editor'),
    [entryNamespace],
  );
  const entryEditorFontNamespace = useMemo(
    () => entryEditorNamespace.getNamespace('fontOptions'),
    [entryEditorNamespace],
  );
  const entryEditorColorNamespace = useMemo(
    () => entryEditorNamespace.getNamespace('colorOptions'),
    [entryEditorNamespace],
  );
  const coverBrand = tCover.t('brand');
  const data = useDiaryData();
  const navigation = useDiaryNavigation();

  const flipRef = useRef<FlipBookHandle | null>(null);
  const flipRefreshFrameRef = useRef<number | null>(null);
  const [currentBody, setCurrentBody] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [goalLinkOpen, setGoalLinkOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(`${todayISO}T00:00:00`));
  const [calendarSelection, setCalendarSelection] = useState(() => navigation.currentDate ?? todayISO);
  const [entryStyles, setEntryStyles] = useState<Map<string, DiaryEntryStyle>>(
    () => new Map(),
  );
  const isDirtyRef = useRef(false);
  const passiveHandlersCleanupRef = useRef<(() => void) | null>(null);
  const suppressEditorOnChangeRef = useRef(false);
  const lastLocalEditRef = useRef(0);
  const lastRemoteUpdateRef = useRef(0);
  const loadRequestIdRef = useRef(0);

  // NOTE: flip-book contracts follow docs/stpageflip/README.md; check before tweaking behaviour.
  const scheduleFlipRefresh = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (flipRefreshFrameRef.current !== null) {
      window.cancelAnimationFrame(flipRefreshFrameRef.current);
    }
    flipRefreshFrameRef.current = window.requestAnimationFrame(() => {
      flipRefreshFrameRef.current = null;
      const pageFlipInstance = flipRef.current?.pageFlip?.();
      if (!pageFlipInstance?.update) {
        return;
      }
      pageFlipInstance.update();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (flipRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(flipRefreshFrameRef.current);
      }
    };
  }, []);

  const updateEntryStyle = useCallback(
    (dateISO: string, partial: Partial<DiaryEntryStyle>) => {
      setEntryStyles((prev) => {
        const next = new Map(prev);
        const previous = next.get(dateISO) ?? ENTRY_EDITOR_DEFAULT_STYLE;
        next.set(dateISO, { ...previous, ...partial });
        return next;
      });
      scheduleFlipRefresh();
    },
    [scheduleFlipRefresh],
  );

  const isDesktop = ui.isDesktop();
  const encryption = useDiaryEncryption();

  useEffect(() => {
    const targetDate = navigation.currentDate;

    if (!targetDate) {
      isDirtyRef.current = false;
      lastLocalEditRef.current = 0;
      lastRemoteUpdateRef.current = 0;
      suppressEditorOnChangeRef.current = true;
      setCurrentBody('');
      setCurrentEntryId(null);
      scheduleFlipRefresh();
      return;
    }

    const loadId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = loadId;
    const loadStartedAt = Date.now();

    isDirtyRef.current = false;
    lastLocalEditRef.current = 0;
    lastRemoteUpdateRef.current = 0;
    suppressEditorOnChangeRef.current = true;
    setCurrentBody('');
    setCurrentEntryId(null);

    let cancelled = false;

    void data.loadEntry(targetDate).then((entry) => {
      if (
        cancelled
        || navigation.currentDate !== targetDate
        || loadRequestIdRef.current !== loadId
      ) {
        return;
      }

      if (!entry) {
        lastRemoteUpdateRef.current = 0;
        setCurrentEntryId(null);
        if (!isDirtyRef.current) {
          suppressEditorOnChangeRef.current = true;
          setCurrentBody('');
        } else {
          suppressEditorOnChangeRef.current = false;
        }
        scheduleFlipRefresh();
        return;
      }

      setCurrentEntryId(entry.record.id);

      const remoteTimestampRaw = Date.parse(entry.content.updatedAtISO ?? '');
      const remoteTimestamp = Number.isNaN(remoteTimestampRaw)
        ? loadStartedAt
        : remoteTimestampRaw;
      lastRemoteUpdateRef.current = remoteTimestamp;

      if (lastLocalEditRef.current > loadStartedAt) {
        suppressEditorOnChangeRef.current = false;
        return;
      }

      if (isDirtyRef.current && lastLocalEditRef.current > remoteTimestamp) {
        suppressEditorOnChangeRef.current = false;
        return;
      }

      isDirtyRef.current = false;
      lastLocalEditRef.current = remoteTimestamp;
      suppressEditorOnChangeRef.current = true;
      setCurrentBody(entry.content.body);
      scheduleFlipRefresh();
    });

    return () => {
      cancelled = true;
    };
  }, [data, navigation.currentDate, scheduleFlipRefresh]);

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
    if (currentPage === navigation.currentIndex) {
      return;
    }

    const currentSpread = Math.floor(currentPage / 2);
    const targetSpread = Math.floor(navigation.currentIndex / 2);

    if (currentSpread === targetSpread) {
      return;
    }

    const delta = Math.abs(currentPage - navigation.currentIndex);

    if (delta <= 2) {
      book.flip(navigation.currentIndex);
      return;
    }

    book.turnToPage(navigation.currentIndex);
  }, [navigation.currentIndex]);

  const ensurePassiveTouchHandlers = useCallback(() => {
    const book = flipRef.current?.pageFlip?.();
    const uiInstance: any = book?.ui;
    if (!uiInstance || typeof uiInstance.getDistElement !== 'function') {
      return false;
    }

    const touchStart = uiInstance.onTouchStart as EventListener | undefined;
    const touchMove = uiInstance.onTouchMove as EventListener | undefined;
    const touchEnd = uiInstance.onTouchEnd as EventListener | undefined;
    const distElement: HTMLElement | null = uiInstance.getDistElement();

    if (!distElement || !touchStart || !touchMove || !touchEnd) {
      return false;
    }

    passiveHandlersCleanupRef.current?.();

    distElement.removeEventListener('touchstart', touchStart);
    window.removeEventListener('touchmove', touchMove);
    window.removeEventListener('touchend', touchEnd);

    distElement.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchmove', touchMove, { passive: true });
    window.addEventListener('touchend', touchEnd, { passive: true });

    passiveHandlersCleanupRef.current = () => {
      distElement.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
    };

    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;

    const attempt = () => {
      if (cancelled) {
        return;
      }
      const applied = ensurePassiveTouchHandlers();
      if (!applied) {
        rafId = window.requestAnimationFrame(attempt);
      }
    };

    attempt();

    return () => {
      cancelled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      passiveHandlersCleanupRef.current?.();
      passiveHandlersCleanupRef.current = null;
    };
  }, [ensurePassiveTouchHandlers]);

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
    },
    [navigation],
  );

  const handleSaveEntry = useCallback(async (bodyOverride?: string) => {
    if (!navigation.currentDate) {
      return null;
    }

    const bodyToPersist = bodyOverride ?? currentBody;

    const saved = await data.saveEntry({
      dateISO: navigation.currentDate,
      content: {
        body: bodyToPersist,
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
      },
      tzAtEntry: data.profile?.timezone ?? null,
    });

    setCurrentEntryId(saved.record.id);
    isDirtyRef.current = false;
    const savedTimestamp = Date.parse(saved.content.updatedAtISO ?? '') || Date.now();
    lastLocalEditRef.current = savedTimestamp;
    lastRemoteUpdateRef.current = savedTimestamp;
    suppressEditorOnChangeRef.current = true;
    return saved;
  }, [currentBody, data, navigation.currentDate]);

  const goals = useMemo(() => Array.from(data.goals.values()), [data.goals]);
  const entryMetaMap = data.entryMeta;
  const resolvedTimezone = useMemo(
    () => resolveDiaryTimezone({
      locale,
      profileTimezone: data.profile?.timezone,
    }),
    [locale, data.profile?.timezone],
  );
  const currentMeta = navigation.currentDate ? entryMetaMap.get(navigation.currentDate) : null;
  const sharedProfessionalIds = currentMeta?.sharedProfessionalIds ?? [];
  const linkedGoalIds = currentMeta?.goalIds ?? [];

  const entryDatesSet = useMemo(() => {
    return new Set(Array.from(entryMetaMap.values(), item => item.dateISO));
  }, [entryMetaMap]);

  const goalsSectionIndex = useMemo(() => {
    return navigation.pages.find(
      page => page.kind === 'goals' && page.side === 'left',
    )?.index ?? null;
  }, [navigation.pages]);

  const calendarSectionIndex = useMemo(() => {
    return navigation.pages.find(
      page => page.kind === 'calendar' && page.side === 'left',
    )?.index ?? null;
  }, [navigation.pages]);

  const isGoalsSectionActive = goalsSectionIndex !== null
    && (
      navigation.currentIndex === goalsSectionIndex
      || navigation.currentIndex === goalsSectionIndex + 1
    );

  const isCalendarSectionActive = calendarSectionIndex !== null
    && (
      navigation.currentIndex === calendarSectionIndex
      || navigation.currentIndex === calendarSectionIndex + 1
    );

  const todaySectionIndex = useMemo(() => {
    const page = navigation.pages.find(
      item => item.kind === 'day' && item.dateISO === todayISO,
    );
    return page?.index ?? null;
  }, [navigation.pages, todayISO]);

  const calendarCells = useMemo(() => {
    return buildCalendarGrid(calendarMonth, entryDatesSet, todayISO);
  }, [calendarMonth, entryDatesSet, todayISO]);

  const entryMonthsByYear = useMemo(() => {
    const byYear = new Map<number, Set<number>>();
    entryMetaMap.forEach((meta) => {
      const [yStr, mStr] = meta.dateISO.split('-');
      const y = Number.parseInt(yStr ?? '0', 10) || 0;
      const m = (Number.parseInt(mStr ?? '1', 10) || 1) - 1; // zero-based
      const set = byYear.get(y) ?? new Set<number>();
      set.add(m);
      byYear.set(y, set);
    });
    return byYear;
  }, [entryMetaMap]);

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();

  const availableYears = useMemo(() => Array.from(entryMonthsByYear.keys()).sort((a, b) => a - b), [entryMonthsByYear]);

  const hasOtherYears = useMemo(
    () => availableYears.some(yearValue => yearValue !== calendarYear),
    [availableYears, calendarYear],
  );

  const monthsInSelectedYear = useMemo(
    () => Array.from(entryMonthsByYear.get(calendarYear) ?? new Set<number>()).sort((a, b) => a - b),
    [entryMonthsByYear, calendarYear],
  );

  const monthLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short' }),
    [locale],
  );

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
      setCalendarSelection(normalized);
      setCalendarMonth(new Date(`${normalized}T00:00:00`));
      navigation.setMonth(normalized);
    },
    [navigation],
  );

  const handleSelectYear = useCallback(
    (yearValue: number) => {
      const monthsForYear = Array.from(entryMonthsByYear.get(yearValue) ?? new Set<number>()).sort((a, b) => a - b);
      const firstMonth = monthsForYear[0];
      if (firstMonth === undefined) {
        return;
      }
      const iso = `${yearValue}-${String(firstMonth + 1).padStart(2, '0')}-01`;
      setCalendarSelection(iso);
      setCalendarMonth(new Date(`${iso}T00:00:00`));
      navigation.setMonth(iso);
    },
    [entryMonthsByYear, navigation],
  );

  const handleSelectMonth = useCallback(
    (monthValue: number) => {
      const iso = `${calendarYear}-${String(monthValue + 1).padStart(2, '0')}-01`;
      setCalendarSelection(iso);
      setCalendarMonth(new Date(`${iso}T00:00:00`));
      navigation.setMonth(iso);
    },
    [calendarYear, navigation],
  );

  const handleGoToday = useCallback(() => {
    setCalendarSelection(todayISO);
    setCalendarMonth(new Date(`${todayISO}T00:00:00`));
    navigation.setDate(todayISO);
  }, [navigation, todayISO]);

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

  const basePageClass = 'page diary-page relative flex h-full flex-col p-8';

  const coverLeftPage = (
    <article key="cover-left" className={`${basePageClass} diary-page--cover-left`}>
      <div className="flex h-full flex-col justify-end gap-6">
        <div className="space-y-3 text-left text-muted-foreground/90">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
            {coverBrand}
          </p>
          <h1 className="text-4xl font-semibold text-foreground">
            {tCover.t('leftTitle')}
          </h1>
          <p className="max-w-xs text-sm leading-relaxed">
            {tCover.t('leftDescription')}
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
        <p className="text-sm uppercase tracking-[0.35em]">{coverBrand}</p>
        <h2 className="mt-4 text-4xl font-bold">{tCover.t('rightTitle')}</h2>
        <p className="mt-6 max-w-xs text-sm leading-relaxed">
          {tCover.t('rightDescription')}
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs uppercase tracking-widest">
          <span>{locale.toUpperCase()}</span>
          <span className="h-3 w-px bg-primary-foreground/40" />
          <span>{todayISO}</span>
        </div>
      </div>
    </article>
  );

  const closingLeftPage = (
    <article key="closing-left" className={`${basePageClass} diary-page--cover-back-left`}>
      <div className="flex h-full flex-col justify-between text-sm text-muted-foreground/80">
        <div>
          <p className="text-xs uppercase tracking-[0.3em]">{tClosing.t('noteLabel')}</p>
          <p className="mt-2 max-w-72 leading-relaxed">
            {tClosing.t('noteDescription')}
          </p>
        </div>
        <p className="text-right text-xs uppercase tracking-[0.35em] text-muted-foreground/70">
          {tClosing.t('signature', { brand: coverBrand })}
        </p>
      </div>
    </article>
  );

  const closingRightPage = (
    <article key="closing-right" className={`${basePageClass} diary-page--cover-back-right`}>
      <div className="flex h-full flex-col items-center justify-end gap-6 text-center text-primary-foreground/85">
        <p className="text-xs uppercase tracking-[0.35em]">{tClosing.t('gratitude')}</p>
        <div className="rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em]">
          {t.getNamespace('nav').t('today')}
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
              cell.isCurrentMonth
                ? 'border-border/60 bg-background hover:border-primary/60 hover:bg-primary/5'
                : 'border-dashed border-border/40 bg-muted/20 text-muted-foreground cursor-not-allowed opacity-60',
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
                disabled={!cell.isCurrentMonth}
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
        <ProgressSection
          t={t}
          locale={locale}
          todayISO={todayISO}
          calendarMonth={calendarMonth}
          entryDatesSet={entryDatesSet}
        />
        {hasOtherYears && (
          <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-border/60 bg-background/80 p-2 text-sm">
            {availableYears.map(yearValue => (
              <button
                key={yearValue}
                type="button"
                onClick={() => handleSelectYear(yearValue)}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  yearValue === calendarYear
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {yearValue}
              </button>
            ))}
          </div>
        )}

        {monthsInSelectedYear.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/80 p-2 text-xs uppercase tracking-wide">
            {monthsInSelectedYear.map(monthValue => (
              <button
                key={monthValue}
                type="button"
                onClick={() => handleSelectMonth(monthValue)}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  monthValue === calendarMonthIndex
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {monthLabelFormatter
                  .format(new Date(Date.UTC(calendarYear, monthValue, 1)))
                  .toUpperCase()}
              </button>
            ))}
          </div>
        )}
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

  const firstDayPageIndex = dayPages.length > 0 ? dayPages[0]?.index ?? null : null;
  const lastDayPageIndex = dayPages.length > 0 ? dayPages[dayPages.length - 1]?.index ?? null : null;

  let activeDebugPanel: React.ReactNode = null;

  const dayPagesNodes = dayPages.map((page) => {
    const restrictClickToEdges = page.index !== firstDayPageIndex && page.index !== lastDayPageIndex;
    const entryStyle = entryStyles.get(page.dateISO) ?? ENTRY_EDITOR_DEFAULT_STYLE;
    const fontOption = FONT_OPTIONS.find(option => option.id === entryStyle.font) ?? FONT_OPTIONS[0];
    const colorOption = COLOR_OPTIONS.find(option => option.id === entryStyle.color) ?? COLOR_OPTIONS[0];
    const editable = isEntryEditable(
      page.dateISO,
      todayISO,
      data.diaryGraceMinutes,
      nowISO,
    );
    const hasDeadlineForPage = goals.some(goal => goal.content.deadlineISO === page.dateISO);
    const disableShare = !navigation.currentDate || (!currentEntryId && !editable);
    const disableGoalLink = !navigation.currentDate || (!currentEntryId && !editable);
    const isActivePage = navigation.currentDate === page.dateISO;
    const hasPersistedEntry = entryMetaMap.has(page.dateISO);
    const showReadonlyLabel = !editable && hasPersistedEntry;
    const textareaPlaceholder = editable ? t.getNamespace('entry').t('placeholder') : undefined;
    const showEmptyReadOnlyState = !editable && !hasPersistedEntry;
    const formatBoolean = (value: boolean) => (value ? entryDebugNamespace.t('yes') : entryDebugNamespace.t('no'));
    const formatValue = (value: string | number | null | undefined) => {
      if (value === null || value === undefined || (typeof value === 'string' && value.length === 0)) {
        return entryDebugNamespace.t('missing');
      }

      return String(value);
    };
    const entryKey = `${page.dateISO}:${currentEntryId ?? 'draft'}`;

    const debugItems = [
      { label: entryDebugNamespace.t('currentPageISO'), value: page.dateISO },
      { label: entryDebugNamespace.t('todayISO'), value: todayISO },
      { label: entryDebugNamespace.t('nowISO'), value: nowISO },
      { label: entryDebugNamespace.t('pageIndex'), value: page.index },
      { label: entryDebugNamespace.t('navigationIndex'), value: navigation.currentIndex },
      { label: entryDebugNamespace.t('navigationCurrentDate'), value: navigation.currentDate },
      { label: entryDebugNamespace.t('isActivePage'), value: formatBoolean(isActivePage) },
      { label: entryDebugNamespace.t('isEditable'), value: formatBoolean(editable) },
      { label: entryDebugNamespace.t('hasPersistedEntry'), value: formatBoolean(hasPersistedEntry) },
      { label: entryDebugNamespace.t('graceMinutes'), value: data.diaryGraceMinutes },
      { label: entryDebugNamespace.t('profileTimezone'), value: data.profile?.timezone },
      { label: entryDebugNamespace.t('resolvedTimezone'), value: resolvedTimezone },
      { label: entryDebugNamespace.t('currentEntryId'), value: currentEntryId },
    ] as const;

    if (isActivePage) {
      activeDebugPanel = (
        <section
          key={`debug-${page.dateISO}`}
          className="pointer-events-auto rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/10 p-4 text-xs shadow-sm backdrop-blur-sm"
        >
          <p className="mb-3 font-semibold text-foreground">
            {entryDebugNamespace.t('title')}
          </p>
          <ul className="space-y-1 text-muted-foreground">
            {debugItems.map(item => (
              <li key={item.label} className="flex gap-2">
                <span className="w-48 shrink-0 text-foreground">{item.label}</span>
                <span className="break-all">{formatValue(item.value)}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    const pageSide: 'left' | 'right' = page.index % 2 === 0 ? 'left' : 'right';

    const ensurePageActive = () => {
      if (!isActivePage) {
        navigation.setDate(page.dateISO);
      } else if (navigation.currentIndex !== page.index) {
        navigation.setIndex(page.index);
      }
    };

    const handleFontSelect = (value: EntryFontValue) => {
      updateEntryStyle(page.dateISO, { font: value });
    };

    const handleColorSelect = (value: EntryColorValue) => {
      updateEntryStyle(page.dateISO, { color: value });
    };

    const hasShareAction = data.professionals.length > 0;
    const hasGoalAction = goals.length > 0;

    const selectors = editable
      ? (
          <div className="diary-entry-heading__selects">
            <label
              htmlFor={`diary-entry-font-${page.dateISO}`}
              className="diary-entry-heading__select"
            >
              <span>{entryEditorNamespace.t('fontLabel')}</span>
              <select
                id={`diary-entry-font-${page.dateISO}`}
                className="diary-entry-heading__select-control"
                value={entryStyle.font}
                onChange={(event) => {
                  handleFontSelect(event.target.value as EntryFontValue);
                }}
                disabled={!editable}
              >
                {FONT_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>
                    {entryEditorFontNamespace.t(option.id as never)}
                  </option>
                ))}
              </select>
            </label>
            <label
              htmlFor={`diary-entry-color-${page.dateISO}`}
              className="diary-entry-heading__select"
            >
              <span>{entryEditorNamespace.t('colorLabel')}</span>
              <select
                id={`diary-entry-color-${page.dateISO}`}
                className="diary-entry-heading__select-control"
                value={entryStyle.color}
                onChange={(event) => {
                  handleColorSelect(event.target.value as EntryColorValue);
                }}
                disabled={!editable}
              >
                {COLOR_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>
                    {entryEditorColorNamespace.t(option.id as never)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )
      : null;

    const actionNodes: ReactNode[] = [];

    if (selectors) {
      actionNodes.push(selectors);
    }

    if (hasShareAction) {
      actionNodes.push(
        ui.iconButton({
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

              const saved = await handleSaveEntry(currentBody);
              entryId = saved?.record.id ?? null;
              if (!entryId) {
                return;
              }
              setCurrentEntryId(entryId);
            }

            setShareOpen(true);
          },
        }),
      );
    }

    if (hasGoalAction) {
      actionNodes.push(
        ui.iconButton({
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

              const saved = await handleSaveEntry(currentBody);
              entryId = saved?.record.id ?? null;
              if (!entryId) {
                return;
              }
              setCurrentEntryId(entryId);
            }

            setGoalLinkOpen(true);
          },
        }),
      );
    }

    const headingActions = actionNodes.length > 0
      ? actionNodes.map((node, index) => (
        <Fragment key={`entry-action-${page.dateISO}-${index}`}>
          {node}
        </Fragment>
      ))
      : null;

    const statusLabelText = editable
      ? t.getNamespace('entry').t('editable')
      : showReadonlyLabel
        ? t.getNamespace('entry').t('readonly')
        : showEmptyReadOnlyState
          ? t.getNamespace('entry').t('emptyReadonly')
          : null;

    return (
      <article
        key={page.dateISO}
        className={`${basePageClass} diary-page--entry ${restrictClickToEdges ? 'pointer-events-none' : ''}`}
        onPointerDown={() => {
          if (restrictClickToEdges) {
            return;
          }
          if (!isActivePage || navigation.currentIndex !== page.index) {
            ensurePageActive();
          }
        }}
      >
        {restrictClickToEdges && (
          <>
            <button
              type="button"
              className={`pointer-events-auto absolute inset-y-0 left-0 ${PAGE_EDGE_WIDTH_CLASS} cursor-pointer border-none bg-transparent p-0`}
              aria-hidden="true"
              tabIndex={-1}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                ensurePageActive();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                ensurePageActive();
              }}
            />
            <button
              type="button"
              className={`pointer-events-auto absolute inset-y-0 right-0 ${PAGE_EDGE_WIDTH_CLASS} cursor-pointer border-none bg-transparent p-0`}
              aria-hidden="true"
              tabIndex={-1}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                ensurePageActive();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                ensurePageActive();
              }}
            />
          </>
        )}
        <div
          data-diary-sheet="true"
          className="diary-entry-sheet pointer-events-auto relative z-10 flex h-full flex-col gap-4"
        >
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

          <DiaryEntryEditor
            entryKey={entryKey}
            initialValue={isActivePage ? currentBody : ''}
            editable={editable}
            placeholder={textareaPlaceholder ?? ''}
            heading={formatDateLabel(page.dateISO, locale)}
            statusLabel={statusLabelText}
            actions={headingActions}
            side={pageSide}
            suppressOnChangeRef={suppressEditorOnChangeRef}
            onChange={(nextValue, { source }) => {
              if (!isActivePage) {
                return;
              }
              if (nextValue === currentBody) {
                return;
              }
              setCurrentBody(nextValue);
              if (source === 'external') {
                isDirtyRef.current = false;
                return;
              }
              lastLocalEditRef.current = Date.now();
              if (editable) {
                isDirtyRef.current = true;
                scheduleFlipRefresh();
                void handleSaveEntry(nextValue);
              }
            }}
            fontClassName={fontOption.className}
            colorClassName={colorOption.className}
          />

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
    closingLeftPage,
    closingRightPage,
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {t.getNamespace('header').t('title')}
              </h2>
              {encryption.status === 'ready' && (
                <button
                  type="button"
                  onClick={() => encryption.lock()}
                  className="rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  {t.getNamespace('lock').t('label')}
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t.getNamespace('header').t('subtitle', { date: formatDateLabel(todayISO, locale) })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (goalsSectionIndex !== null) {
                    goToIndex(goalsSectionIndex);
                  }
                }}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  isGoalsSectionActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 text-muted-foreground hover:bg-muted/60'
                }`}
                disabled={goalsSectionIndex === null}
              >
                {t.getNamespace('nav').t('goals')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (calendarSectionIndex !== null) {
                    goToIndex(calendarSectionIndex);
                  }
                }}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  isCalendarSectionActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 text-muted-foreground hover:bg-muted/60'
                }`}
                disabled={calendarSectionIndex === null}
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
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-sm font-semibold">
              <span className="text-muted-foreground">
                {t.getNamespace('nav').t('today')}
              </span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                {todaySectionIndex !== null
                  ? formatDateLabel(todayISO, locale)
                  : t.getNamespace('calendar').t('empty' as never)}
              </span>
            </div>
          </div>
        </div>

        <div className="diary-flipbook-shell">
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
            mobileScrollSupport={false}
            className="w-full"
          >
            {flipPages}
          </FlipBook>
        </div>
        {activeDebugPanel}
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
