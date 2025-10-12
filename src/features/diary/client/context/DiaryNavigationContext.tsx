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
type DiaryDayPage = { kind: 'day'; index: number; dateISO: string };

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
  const normalizedInitial = normalizeDate(deepLink?.dateISO ?? initialDateISO);
  const [datePages, setDatePages] = useState<string[]>(() => {
    const unique = new Set((initialDates ?? []).map(normalizeDate));
    unique.add(normalizedInitial);
    return Array.from(unique);
  });
  const basePageCount = 6;
  const [currentIndex, setCurrentIndex] = useState<number>(
    deepLink?.index ?? basePageCount,
  );
  const [currentDate, setCurrentDate] = useState<string | null>(
    deepLink?.index !== undefined && deepLink.index < basePageCount ? null : normalizedInitial,
  );

  const pages = useMemo<DiaryPage[]>(() => {
    const staticPages: DiaryPage[] = [
      { kind: 'cover-left', index: 0 },
      { kind: 'cover-right', index: 1 },
      { kind: 'goals', side: 'left', index: 2 },
      { kind: 'goals', side: 'right', index: 3 },
      { kind: 'calendar', side: 'left', index: 4 },
      { kind: 'calendar', side: 'right', index: 5 },
    ];

    const dayPages = datePages.map((dateISO, position) => ({
      kind: 'day' as const,
      index: position + basePageCount,
      dateISO,
    }));

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

      const page = pages.find(item => item.kind === 'day' && item.dateISO === normalized);
      const index = page?.index ?? basePageCount;
      setCurrentIndex(index);
      setCurrentDate(normalized);
      routing.navigateToDiaryDate(normalized);
    },
    [pages, routing],
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
      const [y, m] = normalized.split('-');
      const year = Number.parseInt(y ?? '0', 10) || 0;
      const month = Number.parseInt(m ?? '1', 10) || 1;
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0));

      const monthDays: string[] = [];
      for (
        let cursor = new Date(start);
        cursor.getTime() <= end.getTime();
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      ) {
        const iso = `${cursor.getUTCFullYear()}-${`${cursor.getUTCMonth() + 1}`.padStart(2, '0')}-${`${cursor.getUTCDate()}`.padStart(2, '0')}`;
        monthDays.push(iso);
      }

      setDatePages((prev) => {
        const extra = prev.filter(d => !monthDays.includes(d));
        return [...monthDays, ...extra];
      });

      const selectedIndex = monthDays.indexOf(normalized);
      const index = basePageCount + (selectedIndex >= 0 ? selectedIndex : 0);
      setCurrentIndex(index);
      setCurrentDate(normalized);
      routing.navigateToDiaryDate(normalized);
    },
    [routing],
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
