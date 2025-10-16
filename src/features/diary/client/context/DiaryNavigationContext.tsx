'use client';

/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { RoutingAdapter } from '@/features/diary/adapters/types';

type DiaryStaticPage =
  | { kind: 'cover-left'; index: number }
  | { kind: 'cover-right'; index: number }
  | { kind: 'goals'; side: 'left' | 'right'; index: number }
  | { kind: 'calendar'; side: 'left' | 'right'; index: number };
type DiaryDayPage = { kind: 'day'; side: 'left' | 'right'; index: number; dateISO: string };

export type DiaryPage = DiaryStaticPage | DiaryDayPage;

type DiaryNavigationContextValue = {
  pages: DiaryPage[];
  currentIndex: number;
  currentDate: string | null;
  setIndex: (index: number) => void;
  setDate: (dateISO: string) => void;
  appendDate: (dateISO: string) => void;
  setMonth: (dateISO: string) => void;
};

const DiaryNavigationContext = createContext<DiaryNavigationContextValue | null>(null);

const normalizeDate = (dateISO: string) => dateISO.slice(0, 10);

const buildMonthDays = (anchorISO: string) => {
  const normalized = normalizeDate(anchorISO);
  const [y, m] = normalized.split('-');
  const year = Number.parseInt(y ?? '0', 10) || 0;
  const month = Number.parseInt(m ?? '1', 10) || 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  const days: string[] = [];
  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const iso = `${cursor.getUTCFullYear()}-${`${cursor.getUTCMonth() + 1}`.padStart(2, '0')}-${`${cursor.getUTCDate()}`.padStart(2, '0')}`;
    days.push(iso);
  }

  return days;
};

type DiaryNavigationProviderProps = {
  children: React.ReactNode;
  initialDateISO: string;
  routing: RoutingAdapter;
  initialDates?: string[];
};

export const DiaryNavigationProvider = ({
  children,
  initialDateISO,
  routing,
  initialDates,
}: DiaryNavigationProviderProps) => {
  const deepLink = routing.readDeepLink();
  const normalizedInitial = normalizeDate(initialDateISO);
  const deepLinkDate = deepLink?.dateISO ? normalizeDate(deepLink.dateISO) : null;
  const initialActiveDate = deepLinkDate ?? normalizedInitial;
  const basePageCount = 6;

  const initialDatePages = useMemo(() => {
    const monthDays = buildMonthDays(initialActiveDate);
    const extraDates = (initialDates ?? [])
      .map(normalizeDate)
      .filter(dateISO => !monthDays.includes(dateISO));
    return [...monthDays, ...extraDates];
  }, [initialActiveDate, initialDates]);

  const initialIndex = useMemo(() => {
    if (deepLink?.index !== undefined) {
      return deepLink.index;
    }
    const position = initialDatePages.indexOf(initialActiveDate);
    return position >= 0 ? basePageCount + position * 2 : basePageCount;
  }, [basePageCount, deepLink?.index, initialActiveDate, initialDatePages]);

  const initialCurrentDate = useMemo(() => {
    if (deepLink?.index !== undefined) {
      if (deepLink.index < basePageCount) {
        return null;
      }
      const position = Math.floor((deepLink.index - basePageCount) / 2);
      return initialDatePages[position] ?? initialActiveDate;
    }
    return initialActiveDate;
  }, [basePageCount, deepLink?.index, initialActiveDate, initialDatePages]);

  const [datePages, setDatePages] = useState<string[]>(initialDatePages);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [currentDate, setCurrentDate] = useState<string | null>(initialCurrentDate);

  const pages = useMemo<DiaryPage[]>(() => {
    const staticPages: DiaryPage[] = [
      { kind: 'cover-left', index: 0 },
      { kind: 'cover-right', index: 1 },
      { kind: 'goals', side: 'left', index: 2 },
      { kind: 'goals', side: 'right', index: 3 },
      { kind: 'calendar', side: 'left', index: 4 },
      { kind: 'calendar', side: 'right', index: 5 },
    ];

    const dayPages = datePages.flatMap((dateISO, position) => {
      const leftIndex = basePageCount + position * 2;
      return [
        {
          kind: 'day' as const,
          side: 'left' as const,
          index: leftIndex,
          dateISO,
        },
        {
          kind: 'day' as const,
          side: 'right' as const,
          index: leftIndex + 1,
          dateISO,
        },
      ];
    });

    return [...staticPages, ...dayPages];
  }, [basePageCount, datePages]);

  const setIndex = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      const page = pages.find(item => item.index === index);
      if (page?.kind === 'day') {
        setCurrentDate(page.dateISO);
        routing.navigateToDiaryDate(page.dateISO);
      } else {
        setCurrentDate(null);
        routing.navigateToDiaryIndex(index);
      }
    },
    [pages, routing],
  );

  const setDate = useCallback(
    (dateISO: string) => {
      const normalized = normalizeDate(dateISO);

      setDatePages((prev) => {
        if (prev.includes(normalized)) {
          return prev;
        }
        return [normalized, ...prev];
      });

      const page = pages.find(item => item.kind === 'day' && item.side === 'left' && item.dateISO === normalized);
      const index = page?.index ?? basePageCount;
      setCurrentIndex(index);
      setCurrentDate(normalized);
      routing.navigateToDiaryDate(normalized);
    },
    [basePageCount, pages, routing],
  );

  const appendDate = useCallback((dateISO: string) => {
    const normalized = normalizeDate(dateISO);
    setDatePages((prev) => {
      if (prev.includes(normalized)) {
        return prev;
      }
      return [...prev, normalized];
    });
  }, []);

  const setMonth = useCallback(
    (dateISO: string) => {
      const normalized = normalizeDate(dateISO);
      const monthDays = buildMonthDays(normalized);

      setDatePages((prev) => {
        const extra = prev.filter(d => !monthDays.includes(d));
        return [...monthDays, ...extra];
      });

      const selectedIndex = monthDays.indexOf(normalized);
      const index = basePageCount + (selectedIndex >= 0 ? selectedIndex * 2 : 0);
      setCurrentIndex(index);
      setCurrentDate(normalized);
      routing.navigateToDiaryDate(normalized);
    },
    [basePageCount, routing],
  );

  const value = useMemo<DiaryNavigationContextValue>(
    () => ({
      pages,
      currentIndex,
      currentDate,
      setIndex,
      setDate,
      appendDate,
      setMonth,
    }),
    [appendDate, currentDate, currentIndex, pages, setDate, setIndex, setMonth],
  );

  return (
    <DiaryNavigationContext.Provider value={value}>
      {children}
    </DiaryNavigationContext.Provider>
  );
};

export const useDiaryNavigation = () => {
  const context = useContext(DiaryNavigationContext);
  if (!context) {
    throw new Error('useDiaryNavigation must be used within DiaryNavigationProvider');
  }
  return context;
};
