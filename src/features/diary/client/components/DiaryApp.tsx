'use client';

import type { TranslationValues } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type {
  DiaryEntryMeta,
  DiaryEntryRecord,
  DiaryGoalRecord,
} from '@/features/diary/adapters/types';
import { DiaryCoachProvider } from '@/features/diary/client/context/DiaryCoachContext';
import { DiaryDataProvider } from '@/features/diary/client/context/DiaryDataContext';
import type { DiaryKeyringData } from '@/features/diary/client/context/DiaryEncryptionContext';
import { DiaryEncryptionProvider } from '@/features/diary/client/context/DiaryEncryptionContext';
import { DiaryNavigationProvider } from '@/features/diary/client/context/DiaryNavigationContext';
import { cryptoAdapter } from '@/features/diary/client/cryptoAdapter';
import { createRoutingAdapter } from '@/features/diary/client/routingAdapter';
import { createTranslationAdapter } from '@/features/diary/client/translationAdapter';
import { uiAdapter } from '@/features/diary/client/uiAdapter';

import { DiaryUnlockGate } from './DiaryUnlockGate';
import { DiaryViewport } from './DiaryViewport';

type DiaryAppProps = {
  locale: string;
  todayISO: string;
  nowISO: string;
  basePath: string;
  dateQueryParam?: string;
  indexQueryParam?: string;
  diaryGraceMinutes: number | null;
  runtimePromptLocaleFallback: string;
  runtimeCoachScope?: string;
  runtimeCoachTags?: string[];
  coachEnabled?: boolean;
  initialKeyring: DiaryKeyringData | null;
  initialProfile: {
    avatarAnimal: string | null;
    timezone?: string | null;
  } | null;
  initialEntryRecord?: DiaryEntryRecord | null;
  initialGoals?: DiaryGoalRecord[];
  initialMeta?: DiaryEntryMeta[];
};

export const DiaryApp = ({
  locale,
  todayISO,
  nowISO,
  basePath,
  dateQueryParam,
  indexQueryParam,
  diaryGraceMinutes,
  runtimePromptLocaleFallback,
  runtimeCoachScope,
  runtimeCoachTags,
  coachEnabled = true,
  initialKeyring,
  initialProfile,
  initialEntryRecord,
  initialGoals,
  initialMeta,
}: DiaryAppProps) => {
  const translate = useTranslations('diary');
  const t = useMemo(
    () =>
      createTranslationAdapter((key, vars) =>
        translate(key as any, vars as TranslationValues | undefined),
      ),
    [translate],
  );

  const routing = useMemo(
    () =>
      createRoutingAdapter({
        basePath,
        dateQueryParam,
        indexQueryParam,
      }),
    [basePath, dateQueryParam, indexQueryParam],
  );

  return (
    <DiaryEncryptionProvider initialKeyring={initialKeyring} cryptoAdapter={cryptoAdapter}>
      <DiaryUnlockGate t={t}>
        <DiaryCoachProvider>
          <DiaryDataProvider
            todayISO={todayISO}
            diaryGraceMinutes={diaryGraceMinutes}
            initialProfile={initialProfile}
            cryptoAdapter={cryptoAdapter}
            initialEntryRecord={initialEntryRecord ?? undefined}
            initialGoals={initialGoals ?? []}
            initialMeta={initialMeta ?? []}
          >
            <DiaryNavigationProvider
              initialDateISO={todayISO}
              routing={routing}
              initialDates={initialMeta?.map(item => item.dateISO) ?? []}
            >
              <DiaryViewport
                locale={locale}
                todayISO={todayISO}
                nowISO={nowISO}
                t={t}
                ui={uiAdapter}
                coachEnabled={coachEnabled}
                promptLocaleFallback={runtimePromptLocaleFallback}
                coachScope={runtimeCoachScope}
                coachTags={runtimeCoachTags}
              />
            </DiaryNavigationProvider>
          </DiaryDataProvider>
        </DiaryCoachProvider>
      </DiaryUnlockGate>
    </DiaryEncryptionProvider>
  );
};
