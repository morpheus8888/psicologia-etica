import type { ReactNode } from 'react';

import type {
  DiaryEntryMeta,
  DiaryEntryRecord,
  DiaryFeatureAdapters,
  DiaryGoalRecord,
} from '@/features/diary/adapters/types';
import { DiaryApp } from '@/features/diary/client/components/DiaryApp';
import type { DiaryRouteProps } from '@/registries/diaryRouteRegistry';

import type { DiaryFeatureRouteConfig, DiaryFeatureRuntimeConfig } from './config';
import { resolveDiaryTimezone } from './resolveTimezone';

type CreateDiaryRouteMountParams = {
  adapters: DiaryFeatureAdapters;
  runtime: DiaryFeatureRuntimeConfig;
  route: DiaryFeatureRouteConfig;
  coachEnabled: boolean;
};

export const createDiaryRouteMount = ({
  adapters,
  runtime,
  route,
  coachEnabled,
}: CreateDiaryRouteMountParams) => {
  return async ({ locale }: DiaryRouteProps): Promise<ReactNode> => {
    const { id: userId } = await adapters.auth.requireAuth();
    const profile = await adapters.profile.getUserProfile(userId);
    const keyring = await adapters.keyringStore.getEncMasterKey(userId);

    const now = runtime.getNow?.() ?? new Date();
    const timezone = resolveDiaryTimezone({
      locale,
      profileTimezone: profile?.timezone,
    });

    const toISODate = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(date);
      const year = parts.find(part => part.type === 'year')?.value ?? '0000';
      const month = parts.find(part => part.type === 'month')?.value ?? '01';
      const day = parts.find(part => part.type === 'day')?.value ?? '01';
      return `${year}-${month}-${day}`;
    };

    const addDays = (date: Date, diff: number) => {
      const copy = new Date(date);
      copy.setDate(copy.getDate() + diff);
      return copy;
    };

    const todayISO = toISODate(now);
    const fromISO = toISODate(addDays(now, -30));
    const toISO = toISODate(addDays(now, 1));

    const [initialEntryRecord, initialGoals, initialMeta] = (await Promise.all([
      adapters.diaryStore.getEntryByDate(userId, todayISO),
      adapters.diaryStore.listGoals(userId),
      adapters.diaryStore.listEntriesMeta(userId, {
        from: fromISO,
        to: toISO,
      }),
    ])) as [DiaryEntryRecord | null, DiaryGoalRecord[], DiaryEntryMeta[]];

    return (
      <DiaryApp
        locale={locale}
        todayISO={todayISO}
        nowISO={now.toISOString()}
        basePath={route.basePath}
        dateQueryParam={route.dateQueryParam}
        indexQueryParam={route.indexQueryParam}
        diaryGraceMinutes={runtime.diaryGraceMinutes ?? null}
        runtimePromptLocaleFallback={runtime.promptLocaleFallback ?? 'it'}
        runtimeCoachScope={runtime.coachScope}
        runtimeCoachTags={runtime.coachTags}
        coachEnabled={coachEnabled}
        initialKeyring={keyring}
        initialProfile={profile}
        initialEntryRecord={initialEntryRecord}
        initialGoals={initialGoals}
        initialMeta={initialMeta}
      />
    );
  };
};
