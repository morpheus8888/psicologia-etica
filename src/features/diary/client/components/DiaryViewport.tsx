'use client';

import { CalendarDays, ChevronLeft, ChevronRight, Link2, Settings2, Target } from 'lucide-react';
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
import { useDiaryEntrySession } from '@/features/diary/client/hooks/useDiaryEntrySession';
import { isEntryEditable } from '@/features/diary/client/utils/is-entry-editable';

import { DiaryCoachDock } from './DiaryCoachDock';
import { DiaryEntryEditor } from './DiaryEntryEditor';
import { DiaryEntryPreview } from './DiaryEntryPreview';
import { DiaryGoalLinkPanel } from './DiaryGoalLinkPanel';
import { DiarySharePanel } from './DiarySharePanel';

const FlipBook = HTMLFlipBook as unknown as ComponentType<any>;
const PAGE_EDGE_WIDTH_CLASS = 'w-16'; // 64px edge activation zones
const DEBUG_BUFFER_LIMIT = 200;
const DEBUG_STUCK_TIMEOUT_MS = 1200;
const FLIP_UPDATE_THROTTLE_MS = 120;
const TOUCH_EVENTS = new Set(['touchstart', 'touchmove', 'touchend', 'touchcancel']);

type DebugCounters = {
  editorUser: number;
  editorExternal: number;
  editorSuppressed: number;
  editorComposition: number;
  flipInit: number;
  flipEvents: number;
  flipUpdates: number;
  flipUpdatesSkipped: number;
  draftsSaved: number;
  draftsLoaded: number;
  savesQueued: number;
  savesFlushed: number;
  ensurePassiveApplied: number;
  ensurePassiveSkipped: number;
  navigationChanges: number;
  stuckEvents: number;
};

type DebugEvent = {
  ts: number;
  label: string;
  details: Record<string, unknown>;
};

type DebugOptionsState = {
  suspendFlipUpdates: boolean;
  disableEdgeOverlays: boolean;
  blockTouchReattach: boolean;
  enableMouseEvents: boolean;
  enableClickFlip: boolean;
  enableMobileScroll: boolean;
  verbose: boolean;
};

type DebugSnapshot = {
  context?: string;
  navigationDate: string | null;
  navigationIndex: number;
  bookReady: boolean;
  isDirty: boolean;
  suppressOnChange: boolean;
  externalOrigin: string | null;
  pendingSave: { dateISO: string; bodyLength: number } | null;
  currentBodyLength: number;
  lastLocalEdit: number;
  lastRemoteUpdate: number;
  debugOptions: DebugOptionsState;
};

const safeJson = (value: unknown, maxLength = 400) => {
  try {
    const text = JSON.stringify(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  } catch {
    return '[unserializable]';
  }
};

type PatchedEventTarget = EventTarget & {
  addEventListener: typeof EventTarget.prototype.addEventListener;
  removeEventListener: typeof EventTarget.prototype.removeEventListener;
  __diaryPassivePatched?: boolean;
};

const enforcePassiveListeners = (target: EventTarget | null | undefined) => {
  if (!target) {
    return false;
  }
  const patchedTarget = target as PatchedEventTarget;
  if (patchedTarget.__diaryPassivePatched) {
    return false;
  }
  const originalAdd = patchedTarget.addEventListener;
  if (typeof originalAdd !== 'function') {
    return false;
  }

  const patchedAdd: typeof patchedTarget.addEventListener = function (
    this: PatchedEventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (TOUCH_EVENTS.has(type)) {
      let normalized: AddEventListenerOptions;
      if (typeof options === 'boolean') {
        normalized = { passive: true, capture: options };
      } else if (options) {
        normalized = { ...options, passive: true };
      } else {
        normalized = { passive: true };
      }
      return originalAdd.call(this, type, listener, normalized);
    }
    return originalAdd.call(this, type, listener, options as any);
  };

  patchedTarget.addEventListener = patchedAdd;
  patchedTarget.__diaryPassivePatched = true;
  return true;
};

type PageFlipApi = {
  update: () => void;
  updateFromHtml?: (items: NodeListOf<HTMLElement> | HTMLElement[]) => void;
  getUI: () => {
    getDistElement: () => HTMLElement;
  };
  getPageCount?: () => number;
  getCurrentPageIndex: () => number;
  flip: (pageIndex: number, corner?: unknown) => void;
  turnToPage: (pageIndex: number) => void;
  flipNext?: () => void;
  flipPrev?: () => void;
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

const DEFAULT_ENTRY_FONT_CLASS = 'diary-entry-font-sans';
const DEFAULT_ENTRY_COLOR_CLASS = 'diary-entry-color-ink';

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
  const coverBrand = tCover.t('brand');
  const data = useDiaryData();
  const navigation = useDiaryNavigation();

  const flipRef = useRef<FlipBookHandle | null>(null);
  const flipRefreshFrameRef = useRef<number | null>(null);
  const flipBookReadyRef = useRef(false);
  const [hasTouchSupport, setHasTouchSupport] = useState(false);
  const touchSupportRef = useRef(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [goalLinkOpen, setGoalLinkOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(`${todayISO}T00:00:00`));
  const [calendarSelection, setCalendarSelection] = useState(() => navigation.currentDate ?? todayISO);
  const passiveHandlersCleanupRef = useRef<(() => void) | null>(null);
  const debugEventsRef = useRef<DebugEvent[]>([]);
  const debugCountersRef = useRef<DebugCounters>({
    editorUser: 0,
    editorExternal: 0,
    editorSuppressed: 0,
    editorComposition: 0,
    flipInit: 0,
    flipEvents: 0,
    flipUpdates: 0,
    flipUpdatesSkipped: 0,
    draftsSaved: 0,
    draftsLoaded: 0,
    savesQueued: 0,
    savesFlushed: 0,
    ensurePassiveApplied: 0,
    ensurePassiveSkipped: 0,
    navigationChanges: 0,
    stuckEvents: 0,
  });
  const debugRefreshRafRef = useRef<number | null>(null);
  const [visibleDebugEvents, setVisibleDebugEvents] = useState<DebugEvent[]>([]);
  const [debugOptions, setDebugOptions] = useState<DebugOptionsState>({
    suspendFlipUpdates: false,
    disableEdgeOverlays: false,
    blockTouchReattach: false,
    enableMouseEvents: false,
    enableClickFlip: false,
    enableMobileScroll: false,
    verbose: false,
  });
  const flipbookSettingsKey = useMemo(
    () => JSON.stringify({
      enableMouseEvents: debugOptions.enableMouseEvents,
      enableClickFlip: debugOptions.enableClickFlip,
      enableMobileScroll: debugOptions.enableMobileScroll,
    }),
    [debugOptions.enableClickFlip, debugOptions.enableMobileScroll, debugOptions.enableMouseEvents],
  );
  const debugOptionsRef = useRef(debugOptions);
  const debugLastUserInputRef = useRef(0);
  const debugStuckTimeoutRef = useRef<number | null>(null);
  const [debugActionMessage, setDebugActionMessage] = useState<{ text: string; tone: 'info' | 'success' | 'error' } | null>(null);
  const compositionActiveRef = useRef(false);
  const editorHasFocusRef = useRef(false);
  const transientBlurRef = useRef(false);
  const pendingFlipRefreshRef = useRef(false);
  const editorEditableStateRef = useRef<boolean | null>(null);
  const editabilityLogCacheRef = useRef<Map<string, { result: boolean; reason: string; diffMinutes: number | null; graceMinutes: number | null; ts: number }>>(new Map());
  const debugSuppressLogsRef = useRef(false);
  const suppressDayPageLogsRef = useRef(false);
  const lastFlipStateRef = useRef<string | null>(null);
  const lastFlipStateTsRef = useRef<number>(0);
  const [isEditorInteracting, setIsEditorInteracting] = useState(false);
  const lastFlipUpdateTimeRef = useRef(0);
  const [isFlipbookReady, setIsFlipbookReady] = useState(false);
  const clientTodayISORef = useRef(toISODate(new Date()));
  const clientNowRef = useRef(Date.now());

  const collectDebugSnapshotRef = useRef<(context?: string) => DebugSnapshot>(() => ({
    context: undefined,
    navigationDate: navigation.currentDate,
    navigationIndex: navigation.currentIndex,
    bookReady: flipBookReadyRef.current,
    isDirty: false,
    suppressOnChange: false,
    externalOrigin: null,
    pendingSave: null,
    currentBodyLength: 0,
    lastLocalEdit: 0,
    lastRemoteUpdate: 0,
    debugOptions: debugOptionsRef.current,
  }));

  const scheduleDebugRefresh = useCallback(() => {
    const snapshot = () => {
      setVisibleDebugEvents([...debugEventsRef.current]);
    };

    if (typeof window === 'undefined') {
      snapshot();
      return;
    }
    if (debugRefreshRafRef.current !== null) {
      return;
    }
    debugRefreshRafRef.current = window.requestAnimationFrame(() => {
      debugRefreshRafRef.current = null;
      snapshot();
    });
  }, []);

  const collectDebugSnapshot = useCallback(
    (context?: string) => collectDebugSnapshotRef.current(context),
    [],
  );

  useEffect(() => {
    setVisibleDebugEvents([...debugEventsRef.current]);
  }, []);

  useEffect(() => {
    debugOptionsRef.current = debugOptions;
  }, [debugOptions]);

  const logDebug = useCallback((label: string, details: Record<string, unknown> = {}, includeSnapshot = false) => {
    if (debugSuppressLogsRef.current && label !== 'debug.log.clear') {
      return;
    }
    const entry: DebugEvent = {
      ts: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      label,
      details: includeSnapshot ? { ...details, snapshot: collectDebugSnapshot(label) } : details,
    };
    debugEventsRef.current.push(entry);
    if (debugEventsRef.current.length > DEBUG_BUFFER_LIMIT) {
      debugEventsRef.current.splice(0, debugEventsRef.current.length - DEBUG_BUFFER_LIMIT);
    }
    scheduleDebugRefresh();
  }, [collectDebugSnapshot, scheduleDebugRefresh]);

  const incrementCounter = useCallback((key: keyof DebugCounters) => {
    debugCountersRef.current[key] += 1;
    if (debugOptionsRef.current.verbose) {
      logDebug('debug.counter', { key, value: debugCountersRef.current[key] });
    }
  }, [logDebug]);

  const evaluateEditability = useCallback(
    (dateISO: string, context: 'current-page' | 'day-page' | 'load-sync' | 'debug') => {
      const clientTodayISO = clientTodayISORef.current;
      const clientNow = clientNowRef.current;
      const graceMinutes = data.diaryGraceMinutes ?? null;
      const computed = isEntryEditable(
        dateISO,
        todayISO,
        graceMinutes,
        nowISO,
        clientTodayISO,
        clientNow,
      );
      const targetMs = Date.parse(`${dateISO}T23:59:59Z`);
      const serverNowMs = Date.parse(nowISO);
      const effectiveNowMs = Number.isNaN(clientNow) ? serverNowMs : clientNow;
      const diffMinutesRaw = Number.isFinite(targetMs)
        ? Math.abs(targetMs - effectiveNowMs) / 60000
        : null;
      const diffMinutes = diffMinutesRaw !== null ? Number.parseFloat(diffMinutesRaw.toFixed(2)) : null;
      let reason: string;
      if (dateISO === todayISO) {
        reason = 'match-server-today';
      } else if (dateISO === clientTodayISO) {
        reason = 'match-client-today';
      } else if (!graceMinutes || graceMinutes <= 0) {
        reason = 'grace-disabled';
      } else if (diffMinutes !== null && diffMinutes <= graceMinutes) {
        reason = 'within-grace';
      } else if (diffMinutes === null) {
        reason = 'invalid-target-date';
      } else {
        reason = 'grace-expired';
      }
      if (context === 'day-page' && !debugOptionsRef.current.verbose) {
        return computed;
      }
      if (suppressDayPageLogsRef.current && context === 'day-page') {
        return computed;
      }

      const nowTs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const cacheKey = `${context}:${dateISO}`;
      const previous = editabilityLogCacheRef.current.get(cacheKey);
      const shouldLog = !previous
        || previous.result !== computed
        || previous.reason !== reason
        || previous.diffMinutes !== diffMinutes
        || previous.graceMinutes !== graceMinutes
        || nowTs - previous.ts > 2000;
      if (shouldLog) {
        logDebug('entry.editable.evaluate', {
          context,
          dateISO,
          result: computed,
          reason,
          todayISO,
          clientTodayISO,
          nowISO,
          clientNow,
          serverNowMs,
          effectiveNowMs,
          targetMs,
          diffMinutes,
          graceMinutes,
        });
        if (
          process.env.NODE_ENV !== 'production'
          && !computed
          && diffMinutes !== null
          && graceMinutes
          && diffMinutes <= graceMinutes
        ) {
          logDebug('entry.editable.mismatch', {
            context,
            dateISO,
            diffMinutes,
            graceMinutes,
            todayISO,
            clientTodayISO,
          }, true);
        }
      }
      editabilityLogCacheRef.current.set(cacheKey, {
        result: computed,
        reason,
        diffMinutes,
        graceMinutes,
        ts: nowTs,
      });
      return computed;
    },
    [data.diaryGraceMinutes, logDebug, nowISO, todayISO],
  );

  const scheduleDebugStuckCheck = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (debugStuckTimeoutRef.current !== null) {
      window.clearTimeout(debugStuckTimeoutRef.current);
    }
    const scheduledAt = Date.now();
    debugStuckTimeoutRef.current = window.setTimeout(() => {
      debugStuckTimeoutRef.current = null;
      if (Date.now() - debugLastUserInputRef.current >= DEBUG_STUCK_TIMEOUT_MS) {
        incrementCounter('stuckEvents');
        logDebug('editor.stuck', {
          lastUserInputAt: debugLastUserInputRef.current,
          checkAt: scheduledAt + DEBUG_STUCK_TIMEOUT_MS,
        }, true);
      }
    }, DEBUG_STUCK_TIMEOUT_MS);
  }, [incrementCounter, logDebug]);

  useEffect(() => {
    return () => {
      if (debugRefreshRafRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(debugRefreshRafRef.current);
      }
      if (debugStuckTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(debugStuckTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const hasTouchSupport = Boolean(
      'ontouchstart' in window
      || (navigator?.maxTouchPoints ?? 0) > 0
      || window.matchMedia?.('(pointer: coarse)')?.matches,
    );
    touchSupportRef.current = hasTouchSupport;
    setHasTouchSupport(hasTouchSupport);
    logDebug('touch.support.detect', { hasTouchSupport });
  }, [logDebug]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const refreshClientTime = () => {
      clientTodayISORef.current = toISODate(new Date());
      clientNowRef.current = Date.now();
    };
    refreshClientTime();
    window.addEventListener('focus', refreshClientTime);
    const intervalId = window.setInterval(refreshClientTime, 60_000);
    return () => {
      window.removeEventListener('focus', refreshClientTime);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (debugStuckTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(debugStuckTimeoutRef.current);
      debugStuckTimeoutRef.current = null;
    }
  }, [navigation.currentDate]);

  useEffect(() => {
    logDebug('debug.options.change', debugOptions);
  }, [debugOptions, logDebug]);

  const debugEvents = [...visibleDebugEvents].sort((a, b) => b.ts - a.ts);

  const debugCounters = { ...debugCountersRef.current };

  const handleDebugToggle = useCallback((key: keyof typeof debugOptions) => {
    setDebugOptions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleCopyDebugLog = useCallback(() => {
    const payload = {
      timestamp: new Date().toISOString(),
      snapshot: collectDebugSnapshot('copy'),
      counters: debugCountersRef.current,
      options: debugOptionsRef.current,
      events: debugEventsRef.current,
    };
    const serialized = JSON.stringify(payload, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(serialized).then(() => {
        setDebugActionMessage({ text: 'Copied debug log to clipboard', tone: 'success' });
        logDebug('debug.copy.success', { length: serialized.length });
      }).catch((error) => {
        setDebugActionMessage({
          text: `Copy failed: ${error instanceof Error ? error.message : String(error)}`,
          tone: 'error',
        });
        logDebug('debug.copy.error', { message: error instanceof Error ? error.message : String(error) });
      });
    } else {
      setDebugActionMessage({
        text: 'Clipboard API unavailable; check console for payload',
        tone: 'info',
      });
      logDebug('debug.copy.unavailable', { length: serialized.length });
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.info('[DiaryDebug] Copy payload', payload);
      }
    }
  }, [collectDebugSnapshot, logDebug]);

  const handleClearDebugLog = useCallback(() => {
    debugSuppressLogsRef.current = true;
    suppressDayPageLogsRef.current = true;
    debugEventsRef.current = [];
    editabilityLogCacheRef.current.clear();
    lastFlipStateRef.current = null;
    lastFlipStateTsRef.current = 0;
    setVisibleDebugEvents([]);
    setDebugActionMessage({ text: 'Debug log cleared', tone: 'success' });
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          debugSuppressLogsRef.current = false;
          suppressDayPageLogsRef.current = false;
        });
      });
    } else {
      debugSuppressLogsRef.current = false;
      suppressDayPageLogsRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!debugActionMessage || typeof window === 'undefined') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setDebugActionMessage(null);
    }, 3000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debugActionMessage]);

  useEffect(() => {
    setIsEditorInteracting(false);
  }, [navigation.currentDate]);

  const ensurePassiveTouchHandlers = useCallback(() => {
    if (!hasTouchSupport) {
      logDebug('touch.passive.skip', { reason: 'no-touch-support' });
      return false;
    }
    if (debugOptionsRef.current.blockTouchReattach) {
      incrementCounter('ensurePassiveSkipped');
      logDebug('touch.passive.skip', { reason: 'blockTouchReattach' });
      return false;
    }
    const book = flipRef.current?.pageFlip?.();
    const uiInstance: any = book?.ui;
    if (!uiInstance || typeof uiInstance.getDistElement !== 'function') {
      logDebug('touch.passive.unavailable', { reason: 'missing-ui-instance' });
      return false;
    }

    const touchStart = uiInstance.onTouchStart as EventListener | undefined;
    const touchMove = uiInstance.onTouchMove as EventListener | undefined;
    const touchEnd = uiInstance.onTouchEnd as EventListener | undefined;
    const distElement: HTMLElement | null = uiInstance.getDistElement();

    if (!distElement || !touchStart || !touchMove || !touchEnd) {
      logDebug('touch.passive.unavailable', {
        reason: 'missing-handlers',
        hasDistElement: Boolean(distElement),
        hasTouchStart: Boolean(touchStart),
        hasTouchMove: Boolean(touchMove),
        hasTouchEnd: Boolean(touchEnd),
      });
      return false;
    }

    passiveHandlersCleanupRef.current?.();

    distElement.removeEventListener('touchstart', touchStart);
    window.removeEventListener('touchmove', touchMove);
    window.removeEventListener('touchend', touchEnd);

    const patchedDist = enforcePassiveListeners(distElement);
    if (patchedDist) {
      logDebug('touch.passive.patch', {
        patchedDist: true,
        patchedWindow: false,
      });
    }

    distElement.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchmove', touchMove, { passive: true });
    window.addEventListener('touchend', touchEnd, { passive: true });

    passiveHandlersCleanupRef.current = () => {
      distElement.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
    };

    incrementCounter('ensurePassiveApplied');
    logDebug('touch.passive.attached', {
      distElement: uiInstance.getDistElement()?.tagName ?? 'unknown',
    });
    return true;
  }, [hasTouchSupport, incrementCounter, logDebug]);

  const handleDebugDump = useCallback(() => {
    logDebug('debug.dump', {}, true);
    setDebugActionMessage({ text: 'Debug snapshot dumped to log', tone: 'info' });
  }, [logDebug]);

  // NOTE: flip-book contracts follow docs/stpageflip/README.md; check before tweaking behaviour.
  const scheduleFlipRefresh = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!flipBookReadyRef.current) {
      incrementCounter('flipUpdatesSkipped');
      logDebug('flipbook.update.skip', { reason: 'not-ready' });
      return;
    }
    if (debugOptionsRef.current.suspendFlipUpdates) {
      incrementCounter('flipUpdatesSkipped');
      logDebug('flipbook.update.skip', { reason: 'suspendFlipUpdates' });
      return;
    }
    if (compositionActiveRef.current) {
      incrementCounter('flipUpdatesSkipped');
      logDebug('flipbook.update.skip', { reason: 'composition-active' });
      return;
    }
    if (editorHasFocusRef.current) {
      if (!pendingFlipRefreshRef.current) {
        pendingFlipRefreshRef.current = true;
        incrementCounter('flipUpdatesSkipped');
        logDebug('flipbook.update.skip', { reason: 'editor-focused' });
      }
      return;
    }
    if (flipRefreshFrameRef.current !== null) {
      window.cancelAnimationFrame(flipRefreshFrameRef.current);
    }
    const scheduledAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (scheduledAt - lastFlipUpdateTimeRef.current < FLIP_UPDATE_THROTTLE_MS) {
      incrementCounter('flipUpdatesSkipped');
      logDebug('flipbook.update.skip', {
        reason: 'throttled',
        delta: scheduledAt - lastFlipUpdateTimeRef.current,
      });
      return;
    }
    flipRefreshFrameRef.current = window.requestAnimationFrame(() => {
      flipRefreshFrameRef.current = null;

      if (!flipBookReadyRef.current) {
        pendingFlipRefreshRef.current = true;
        incrementCounter('flipUpdatesSkipped');
        logDebug('flipbook.update.skip', { reason: 'not-ready-late' });
        return;
      }
      if (debugOptionsRef.current.suspendFlipUpdates) {
        pendingFlipRefreshRef.current = true;
        incrementCounter('flipUpdatesSkipped');
        logDebug('flipbook.update.skip', { reason: 'suspendFlipUpdates-late' });
        return;
      }
      if (compositionActiveRef.current) {
        pendingFlipRefreshRef.current = true;
        incrementCounter('flipUpdatesSkipped');
        logDebug('flipbook.update.skip', { reason: 'composition-active-late' });
        return;
      }
      if (editorHasFocusRef.current) {
        pendingFlipRefreshRef.current = true;
        incrementCounter('flipUpdatesSkipped');
        logDebug('flipbook.update.skip', { reason: 'editor-focused-late' });
        return;
      }

      const pageFlipInstance = flipRef.current?.pageFlip?.();
      if (!pageFlipInstance?.update) {
        pendingFlipRefreshRef.current = false;
        incrementCounter('flipUpdatesSkipped');
        logDebug('flipbook.update.skip', { reason: 'no-instance' });
        return;
      }
      pendingFlipRefreshRef.current = false;
      incrementCounter('flipUpdates');
      logDebug('flipbook.update', { scheduledAt, ready: flipBookReadyRef.current });
      pageFlipInstance.update();
      lastFlipUpdateTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      ensurePassiveTouchHandlers();
    });
  }, [ensurePassiveTouchHandlers, incrementCounter, logDebug]);

  const handleManualFlip = useCallback((direction: 'prev' | 'next') => {
    const book = flipRef.current?.pageFlip?.();
    if (!book) {
      logDebug('flipbook.manual.skip', { direction, reason: 'no-instance' });
      return;
    }
    if (!flipBookReadyRef.current) {
      logDebug('flipbook.manual.skip', { direction, reason: 'not-ready' });
      return;
    }
    const currentIndex = typeof book.getCurrentPageIndex === 'function' ? book.getCurrentPageIndex() : 0;
    const pageCount = typeof book.getPageCount === 'function' ? book.getPageCount() : null;
    if (direction === 'prev') {
      if (currentIndex <= 0) {
        logDebug('flipbook.manual.skip', { direction, reason: 'at-start' });
        return;
      }
      if (typeof book.flipPrev === 'function') {
        book.flipPrev();
      } else {
        book.flip(Math.max(0, currentIndex - 1));
      }
    } else {
      if (pageCount !== null && currentIndex >= pageCount - 1) {
        logDebug('flipbook.manual.skip', { direction, reason: 'at-end' });
        return;
      }
      if (typeof book.flipNext === 'function') {
        book.flipNext();
      } else {
        const target = pageCount !== null ? Math.min(pageCount - 1, currentIndex + 1) : currentIndex + 1;
        book.flip(target);
      }
    }
    logDebug('flipbook.manual', { direction, currentIndex, pageCount });
  }, [logDebug]);

  useEffect(() => {
    return () => {
      if (flipRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(flipRefreshFrameRef.current);
      }
    };
  }, []);

  const isDesktop = ui.isDesktop();
  const encryption = useDiaryEncryption();
  const session = useDiaryEntrySession({
    data,
    navigation,
    encryption,
    incrementCounter,
    logDebug,
    scheduleFlipRefresh,
    scheduleDebugStuckCheck,
    debugLastUserInputRef,
    isCurrentPageEditable: () => (navigation.currentDate
      ? evaluateEditability(navigation.currentDate, 'current-page')
      : false),
  });

  const {
    currentBody,
    currentEntryId,
    setCurrentEntryId,
    currentBodyRef,
    isDirtyRef,
    suppressEditorOnChangeRef,
    externalChangeOriginRef,
    pendingSaveValueRef,
    lastLocalEditRef,
    lastRemoteUpdateRef,
    getOrInitEditorVersion,
    handleSaveEntry,
    enqueueSave,
    handleInsertPrompt,
    persistDraft,
    getPreviewBody,
    updateActiveBody,
  } = session;

  collectDebugSnapshotRef.current = (context?: string) => ({
    context,
    navigationDate: navigation.currentDate,
    navigationIndex: navigation.currentIndex,
    bookReady: flipBookReadyRef.current,
    isDirty: isDirtyRef.current,
    suppressOnChange: suppressEditorOnChangeRef.current,
    externalOrigin: externalChangeOriginRef.current,
    pendingSave: pendingSaveValueRef.current
      ? {
          dateISO: pendingSaveValueRef.current.dateISO,
          bodyLength: pendingSaveValueRef.current.body.length,
        }
      : null,
    currentBodyLength: currentBodyRef.current.length,
    lastLocalEdit: lastLocalEditRef.current,
    lastRemoteUpdate: lastRemoteUpdateRef.current,
    debugOptions: debugOptionsRef.current,
  });

  useEffect(() => {
    incrementCounter('navigationChanges');
    logDebug('navigation.change', {
      dateISO: navigation.currentDate,
      index: navigation.currentIndex,
    });
  }, [incrementCounter, logDebug, navigation.currentDate, navigation.currentIndex]);

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
      logDebug('flipbook.syncNavigation.skip', { reason: 'no-instance' });
      return;
    }

    const currentPage = book.getCurrentPageIndex();
    logDebug('flipbook.syncNavigation', {
      currentPage,
      targetIndex: navigation.currentIndex,
    });
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
      logDebug('flipbook.syncNavigation.flip', { currentPage, targetIndex: navigation.currentIndex });
      book.flip(navigation.currentIndex);
      return;
    }

    logDebug('flipbook.syncNavigation.turn', { currentPage, targetIndex: navigation.currentIndex });
    book.turnToPage(navigation.currentIndex);
  }, [logDebug, navigation.currentIndex]);

  useEffect(() => {
    if (!hasTouchSupport) {
      return undefined;
    }
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
  }, [ensurePassiveTouchHandlers, hasTouchSupport]);

  const handleFlip = useCallback(
    (event: { data: number }) => {
      const previousIndex = navigation.currentIndex;
      const nextIndex = event.data;
      incrementCounter('flipEvents');
      logDebug('flipbook.flip', {
        previousIndex,
        nextIndex,
      }, true);
      if (previousIndex !== nextIndex) {
        navigation.setIndex(nextIndex);
      }
    },
    [incrementCounter, logDebug, navigation],
  );

  const handleOrientationChange = useCallback((event: { data: string }) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[DiaryFlipbook] orientation changed:', event.data);
    }
    logDebug('flipbook.orientation', { mode: event.data }, true);
  }, [logDebug]);

  const handleStateChange = useCallback((event: { data: string }) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[DiaryFlipbook] state changed:', event.data);
    }
    const state = event.data;
    const nowTs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (lastFlipStateRef.current === state && nowTs - lastFlipStateTsRef.current < 500) {
      return;
    }
    lastFlipStateRef.current = state;
    lastFlipStateTsRef.current = nowTs;
    logDebug('flipbook.state', { state }, true);
  }, [logDebug]);

  const goToIndex = useCallback(
    (index: number) => {
      if (navigation.currentIndex !== index) {
        navigation.setIndex(index);
      }
    },
    [navigation],
  );

  const handleFlipbookInit = useCallback(() => {
    flipBookReadyRef.current = true;
    setIsFlipbookReady(true);
    const pageFlipInstance = flipRef.current?.pageFlip?.();
    incrementCounter('flipInit');
    const pageCount = pageFlipInstance && typeof (pageFlipInstance as any).getPageCount === 'function'
      ? (pageFlipInstance as any).getPageCount()
      : null;
    logDebug('flipbook.init', {
      navigationIndex: navigation.currentIndex,
      pageCount,
    }, true);
    scheduleFlipRefresh();
    ensurePassiveTouchHandlers();
  }, [ensurePassiveTouchHandlers, incrementCounter, logDebug, navigation.currentIndex, scheduleFlipRefresh]);

  const handleEditorDebug = useCallback((type: string, payload?: Record<string, unknown>) => {
    if (type === 'setEditable') {
      const nextEditable = Boolean(payload?.editable);
      const entryKey = typeof payload?.entryKey === 'string' ? payload.entryKey : null;
      const entryDate = entryKey ? entryKey.split(':')[0] ?? null : null;
      const previousEditable = editorEditableStateRef.current;
      editorEditableStateRef.current = nextEditable;
      logDebug('editor.setEditable.state', {
        entryKey,
        entryDate,
        editable: nextEditable,
        previous: previousEditable,
        navigationDate: navigation.currentDate,
        isActivePage: entryDate ? navigation.currentDate === entryDate : null,
      });
      if (!nextEditable) {
        editorHasFocusRef.current = false;
        setIsEditorInteracting(false);
      }
      return;
    }
    if (
      (type === 'dom.beforeinput' || type === 'dom.input' || type === 'dom.keydown')
      && !editorHasFocusRef.current
    ) {
      editorHasFocusRef.current = true;
      logDebug('editor.dom.focus.inferred', payload ?? {});
    }
    if (type === 'dom.focus') {
      transientBlurRef.current = false;
      editorHasFocusRef.current = true;
      setIsEditorInteracting(true);
      logDebug('editor.dom.focus', payload ?? {});
      return;
    }
    if (type === 'dom.blur') {
      const restorePlanned = Boolean(
        payload && typeof payload === 'object' && 'restorePlanned' in payload
          ? (payload as { restorePlanned?: boolean }).restorePlanned
          : false,
      );
      editorHasFocusRef.current = false;
      transientBlurRef.current = restorePlanned;
      logDebug('editor.dom.blur', {
        ...(payload ?? {}),
        restorePlanned,
      });
      if (!restorePlanned) {
        setIsEditorInteracting(false);
        if (pendingFlipRefreshRef.current) {
          scheduleFlipRefresh();
        }
      }
      return;
    }
    if (type === 'dom.compositionstart') {
      compositionActiveRef.current = true;
      incrementCounter('editorComposition');
      logDebug('editor.composition.start', payload ?? {});
      return;
    }
    if (type === 'dom.compositionend') {
      compositionActiveRef.current = false;
      incrementCounter('editorComposition');
      logDebug('editor.composition.end', payload ?? {});
      scheduleFlipRefresh();
      return;
    }
    if (type === 'dom.input' || type === 'dom.beforeinput' || type === 'dom.keydown' || type === 'dom.keyup') {
      debugLastUserInputRef.current = Date.now();
      scheduleDebugStuckCheck();
    }
    logDebug(`editor.${type}`, payload ?? {});
  }, [incrementCounter, logDebug, navigation.currentDate, scheduleDebugStuckCheck, scheduleFlipRefresh]);

  const goals = useMemo(() => Array.from(data.goals.values()), [data.goals]);
  const entryMetaMap = data.entryMeta;
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
  const manualControlsDisabled = !isFlipbookReady;

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
    const isActivePage = navigation.currentDate === page.dateISO;
    const edgesActive = restrictClickToEdges && !debugOptions.disableEdgeOverlays && !isActivePage;
    const allowEditing = evaluateEditability(page.dateISO, 'day-page');
    const editable = isActivePage && allowEditing;
    const entryVersion = getOrInitEditorVersion(page.dateISO);
    const entryKey = `${page.dateISO}:v${entryVersion}`;
    const showDebugPanel = page.side === 'left' && page.dateISO === todayISO && isFlipbookReady;
    if (showDebugPanel) {
      const liveSnapshot = {
        ...collectDebugSnapshot('panel'),
        entryDate: page.dateISO,
        entryKey,
        entryVersion,
        editable,
        currentEntryId,
      };
      const recentEvents = debugEvents.slice(0, debugOptions.verbose ? 50 : 25);
      const counterEntries = Object.entries(debugCounters).sort(([a], [b]) => a.localeCompare(b));
      activeDebugPanel = (
        <section
          key={`debug-${page.dateISO}`}
          className="fixed bottom-4 right-4 z-[1000] max-w-[420px] rounded-2xl border border-sky-400/60 bg-sky-50 p-4 text-xs text-sky-900 shadow-xl backdrop-blur-sm dark:border-sky-500/60 dark:bg-sky-950/40 dark:text-sky-100"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-100">Diary Debug (Today)</p>
              <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-200/80">
                Reproduced state for active editable page. Copy the log after reproducing the issue.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-sky-500/50 px-2 py-1 text-[11px] font-semibold text-sky-900 transition hover:bg-sky-200/60 dark:border-sky-400/60 dark:text-sky-100 dark:hover:bg-sky-800/40"
                onClick={handleDebugDump}
              >
                Dump state
              </button>
              <button
                type="button"
                className="rounded-md border border-sky-500/50 px-2 py-1 text-[11px] font-semibold text-sky-900 transition hover:bg-sky-200/60 dark:border-sky-400/60 dark:text-sky-100 dark:hover:bg-sky-800/40"
                onClick={handleCopyDebugLog}
              >
                Copy log
              </button>
              <button
                type="button"
                className="rounded-md border border-sky-500/50 px-2 py-1 text-[11px] font-semibold text-sky-900 transition hover:bg-sky-200/60 dark:border-sky-400/60 dark:text-sky-100 dark:hover:bg-sky-800/40"
                onClick={handleClearDebugLog}
              >
                Clear log
              </button>
            </div>
          </div>
          {debugActionMessage
            ? (
                <p
                  className={`mb-2 rounded-md px-2 py-1 text-[11px] font-medium ${
                    debugActionMessage.tone === 'error'
                      ? 'bg-rose-200/70 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100'
                      : debugActionMessage.tone === 'success'
                        ? 'bg-emerald-200/60 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                        : 'bg-sky-200/60 text-sky-900 dark:bg-sky-800/60 dark:text-sky-100'
                  }`}
                >
                  {debugActionMessage.text}
                </p>
              )
            : null}
          <div className="mb-3 grid gap-2 rounded-lg border border-sky-400/50 bg-sky-100/60 p-3 text-[11px] dark:border-sky-500/50 dark:bg-sky-900/40">
            <p className="font-semibold text-sky-900 dark:text-sky-100">Snapshot</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words bg-black/10 p-2 font-mono text-[10px] text-sky-900 dark:bg-black/40 dark:text-sky-100">
              {safeJson(liveSnapshot, 1200)}
            </pre>
          </div>
          <div className="mb-3 grid gap-1 text-[11px] text-sky-900 dark:text-sky-100">
            <span className="font-semibold">Toggles</span>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={debugOptions.suspendFlipUpdates}
                  onChange={() => handleDebugToggle('suspendFlipUpdates')}
                />
                <span>Suspend flip updates</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={debugOptions.disableEdgeOverlays}
                  onChange={() => handleDebugToggle('disableEdgeOverlays')}
                />
                <span>Disable edge overlays</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={debugOptions.blockTouchReattach}
                  onChange={() => handleDebugToggle('blockTouchReattach')}
                />
                <span>Block touch reattach</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={debugOptions.enableMouseEvents}
                  onChange={() => handleDebugToggle('enableMouseEvents')}
                />
                <span>Enable mouse gestures</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={debugOptions.enableClickFlip}
                  onChange={() => handleDebugToggle('enableClickFlip')}
                />
                <span>Enable corner clicks</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={debugOptions.enableMobileScroll}
                  onChange={() => handleDebugToggle('enableMobileScroll')}
                />
                <span>Mobile scroll support</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={debugOptions.verbose}
                  onChange={() => handleDebugToggle('verbose')}
                />
                <span>Verbose logging</span>
              </label>
            </div>
          </div>
          <div className="mb-3 grid gap-1 text-[11px] text-sky-900 dark:text-sky-100">
            <span className="font-semibold">Counters</span>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
              {counterEntries.map(([key, value]) => (
                <span key={key} className="rounded border border-sky-400/40 bg-sky-100/60 px-2 py-1 font-mono dark:border-sky-500/40 dark:bg-sky-900/40">
                  {key}
                  :
                  {value}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-1 text-[11px] text-sky-900 dark:text-sky-100">
            <span className="font-semibold">Recent events</span>
            <div className="max-h-48 overflow-auto rounded border border-sky-400/40 bg-sky-100/60 dark:border-sky-500/40 dark:bg-sky-900/40">
              <ul className="divide-y divide-sky-400/30 dark:divide-sky-500/30">
                {recentEvents.length === 0
                  ? (
                      <li className="p-2 text-sky-700 dark:text-sky-200/80">No events yet</li>
                    )
                  : recentEvents.map(event => (
                    <li key={`${event.ts}-${event.label}`} className="p-2 font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <span>{event.label}</span>
                        <span className="text-sky-700 dark:text-sky-200/80">
                          {event.ts.toFixed(1)}
                          ms
                        </span>
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] text-sky-700 dark:text-sky-200/80">
                        {safeJson(event.details, 800)}
                      </pre>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </section>
      );
    }

    const ensurePageActive = () => {
      if (!isActivePage) {
        logDebug('navigation.ensureActive', { action: 'setDate', targetDate: page.dateISO });
        navigation.setDate(page.dateISO);
        return;
      }

      const currentSpread = Math.floor(navigation.currentIndex / 2);
      const targetSpread = Math.floor(page.index / 2);

      if (currentSpread !== targetSpread) {
        logDebug('navigation.ensureActive', {
          action: 'setIndex',
          targetIndex: page.index,
          currentIndex: navigation.currentIndex,
          currentSpread,
          targetSpread,
        });
        navigation.setIndex(page.index);
      }
    };

    const handleEditorUserInteraction = (
      event: 'pointer' | 'focus' | 'blur',
      details?: {
        restorePlanned?: boolean;
        throttled?: boolean;
        deltaSinceRestore?: number | null;
        attempts?: number;
        targetTagName?: string | null;
      },
    ) => {
      logDebug('editor.interaction', {
        event,
        restorePlanned: details?.restorePlanned ?? null,
        throttled: details?.throttled ?? false,
        deltaSinceRestore: details?.deltaSinceRestore ?? null,
        attempts: details?.attempts ?? null,
        targetTagName: details?.targetTagName ?? null,
        transientBlur: transientBlurRef.current,
        navigationIndex: navigation.currentIndex,
        pageIndex: page.index,
        isActivePage,
      });
      if (event === 'blur') {
        if (details?.restorePlanned || transientBlurRef.current) {
          if (details?.throttled) {
            logDebug('editor.interaction.blur.throttled', {
              deltaSinceRestore: details.deltaSinceRestore ?? null,
              attempts: details.attempts ?? null,
            });
          }
          return;
        }
        setIsEditorInteracting(false);
        return;
      }
      if (event === 'focus' || event === 'pointer') {
        transientBlurRef.current = false;
      }
      if (!isEditorInteracting) {
        setIsEditorInteracting(true);
      }
      if (!isActivePage || navigation.currentIndex !== page.index) {
        ensurePageActive();
      }
    };

    if (page.side === 'right') {
      return (
        <article
          key={`${page.dateISO}-right`}
          className={`${basePageClass} diary-page--entry`}
          onPointerDown={() => {
            if (edgesActive) {
              return;
            }
            if (!isActivePage || navigation.currentIndex !== page.index) {
              ensurePageActive();
            }
          }}
        >
          {edgesActive && (
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
            className="diary-entry-sheet diary-entry-sheet--right relative z-10 flex h-full flex-col"
          >
            <div className="px-6 pt-6">
              <p className="text-lg font-semibold text-foreground">
                {t.getNamespace('extension').t('title')}
              </p>
            </div>
          </div>
        </article>
      );
    }

    const hasDeadlineForPage = goals.some(goal => goal.content.deadlineISO === page.dateISO);
    const disableShare = !navigation.currentDate || (!currentEntryId && !editable);
    const disableGoalLink = !navigation.currentDate || (!currentEntryId && !editable);
    const hasPersistedEntry = entryMetaMap.has(page.dateISO);
    const showReadonlyLabel = !editable && hasPersistedEntry;
    const textareaPlaceholder = editable ? t.getNamespace('entry').t('placeholder') : undefined;
    const previewPlaceholder = textareaPlaceholder ?? t.getNamespace('entry').t('placeholder');
    const showEmptyReadOnlyState = !editable && !hasPersistedEntry;
    const hasShareAction = data.professionals.length > 0;
    const hasGoalAction = goals.length > 0;
    const pageHeading = formatDateLabel(page.dateISO, locale);

    if (debugOptions.verbose) {
      logDebug('entry.page.editability', {
        pageDateISO: page.dateISO,
        todayISO,
        navigationDate: navigation.currentDate,
        index: page.index,
        editable,
        allowEditing,
        isActivePage,
        graceMinutes: data.diaryGraceMinutes,
        side: page.side,
        clientTodayISO: clientTodayISORef.current,
      });
    }

    const actionNodes: { key: string; element: ReactNode }[] = [];

    if (hasShareAction) {
      const shareKey = `entry-action-share-${page.dateISO}`;
      const shareAction = ui.iconButton({
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
      });

      actionNodes.push({ key: shareKey, element: shareAction });
    }

    if (hasGoalAction) {
      const goalKey = `entry-action-goal-${page.dateISO}`;
      const goalAction = ui.iconButton({
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
      });

      actionNodes.push({ key: goalKey, element: goalAction });
    }

    const headingActions = actionNodes.length > 0
      ? actionNodes.map(action => (
        <Fragment key={action.key}>
          {action.element}
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

    const previewBody = getPreviewBody(page.dateISO);

    const entryContent = isActivePage
      ? (
          <DiaryEntryEditor
            entryKey={entryKey}
            initialValue={currentBody}
            editable={editable}
            placeholder={textareaPlaceholder ?? ''}
            heading={pageHeading}
            statusLabel={statusLabelText}
            actions={headingActions}
            side={page.side}
            suppressOnChangeRef={suppressEditorOnChangeRef}
            onUserInteraction={handleEditorUserInteraction}
            onChange={(nextValue, { source }) => {
              logDebug('editor.onChange', {
                source,
                entryKey,
                isActivePage,
                editable,
                bodyLength: nextValue.length,
              });
              if (!isActivePage) {
                logDebug('editor.onChange.suppressed', {
                  reason: 'inactive-page',
                  entryKey,
                  navigationDate: navigation.currentDate,
                  source,
                  editable,
                });
                ensurePageActive();
                setIsEditorInteracting(true);
                incrementCounter('editorSuppressed');
                return;
              }
              if (nextValue === currentBodyRef.current) {
                return;
              }
              updateActiveBody(nextValue);
              if (source === 'external') {
                incrementCounter('editorExternal');
                if (externalChangeOriginRef.current === 'draft') {
                  isDirtyRef.current = true;
                } else if (externalChangeOriginRef.current === 'remote') {
                  isDirtyRef.current = false;
                }
                externalChangeOriginRef.current = null;
                return;
              }
              incrementCounter('editorUser');
              lastLocalEditRef.current = Date.now();
              debugLastUserInputRef.current = Date.now();
              if (!editable || !navigation.currentDate) {
                logDebug('editor.onChange.suppressed', {
                  reason: !editable ? 'not-editable' : 'missing-navigation-date',
                  entryKey,
                  navigationDate: navigation.currentDate,
                  source,
                  editable,
                });
                incrementCounter('editorSuppressed');
                return;
              }
              isDirtyRef.current = true;
              scheduleFlipRefresh();
              void persistDraft(navigation.currentDate, nextValue);
              enqueueSave(navigation.currentDate, nextValue);
              externalChangeOriginRef.current = null;
              scheduleDebugStuckCheck();
            }}
            fontClassName={DEFAULT_ENTRY_FONT_CLASS}
            colorClassName={DEFAULT_ENTRY_COLOR_CLASS}
            onDebugEvent={handleEditorDebug}
          />
        )
      : (
          <DiaryEntryPreview
            heading={pageHeading}
            statusLabel={statusLabelText}
            body={previewBody}
            placeholder={previewPlaceholder}
            fontClassName={DEFAULT_ENTRY_FONT_CLASS}
            colorClassName={DEFAULT_ENTRY_COLOR_CLASS}
            actions={headingActions}
          />
        );

    return (
      <article
        key={`${page.dateISO}-left`}
        className={`${basePageClass} diary-page--entry`}
        onPointerDown={() => {
          if (edgesActive) {
            return;
          }
          if (!isActivePage || navigation.currentIndex !== page.index) {
            ensurePageActive();
          }
        }}
      >
        {edgesActive && (
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

          {entryContent}

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

        <div className="flex justify-center pt-2">
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleManualFlip('prev')}
              aria-label={t.getNamespace('nav').t('flipPrev')}
              disabled={manualControlsDisabled}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleManualFlip('next')}
              aria-label={t.getNamespace('nav').t('flipNext')}
              disabled={manualControlsDisabled}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="diary-flipbook-shell">
          <FlipBook
            key={flipbookSettingsKey}
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
            onChangeOrientation={handleOrientationChange}
            onChangeState={handleStateChange}
            onInit={handleFlipbookInit}
            disableFlipByClick={!debugOptions.enableClickFlip || isEditorInteracting}
            showPageCorners={debugOptions.enableClickFlip && !isEditorInteracting}
            mobileScrollSupport={debugOptions.enableMobileScroll}
            usePortrait={false}
            useMouseEvents={debugOptions.enableMouseEvents && !isEditorInteracting}
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
          onInsertPrompt={handleInsertPrompt}
          t={t.getNamespace('coach')}
          ui={ui}
        />
      )}
    </>
  );
};
