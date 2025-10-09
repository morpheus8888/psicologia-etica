import { unstable_setRequestLocale } from 'next-intl/server';

import { DiaryApp } from '@/features/diary/client/components/DiaryApp';
import { authAdapter, diaryStoreAdapter, keyringStoreAdapter, profileAdapter } from '@/features/diary/server';
import { getI18nPath } from '@/utils/Helpers';

export const dynamic = 'force-dynamic';

export default async function DiaryPage(props: { params: { locale: string } }) {
  const { locale } = props.params;
  unstable_setRequestLocale(locale);

  const { id: userId } = await authAdapter.requireAuth();
  const profile = await profileAdapter.getUserProfile(userId);
  const keyring = await keyringStoreAdapter.getEncMasterKey(userId);

  const now = new Date();
  const timezone = profile?.timezone ?? 'UTC';

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

  const [initialEntryRecord, initialGoals, initialMeta] = await Promise.all([
    diaryStoreAdapter.getEntryByDate(userId, todayISO),
    diaryStoreAdapter.listGoals(userId),
    diaryStoreAdapter.listEntriesMeta(userId, {
      from: fromISO,
      to: toISO,
    }),
  ]);

  return (
    <DiaryApp
      locale={locale}
      todayISO={todayISO}
      nowISO={now.toISOString()}
      basePath={getI18nPath('/dashboard/diary', locale)}
      dateQueryParam="date"
      indexQueryParam="index"
      diaryGraceMinutes={null}
      runtimePromptLocaleFallback="it"
      runtimeCoachScope={undefined}
      runtimeCoachTags={undefined}
      coachEnabled
      initialKeyring={keyring}
      initialProfile={profile}
      initialEntryRecord={initialEntryRecord}
      initialGoals={initialGoals}
      initialMeta={initialMeta}
    />
  );
}
