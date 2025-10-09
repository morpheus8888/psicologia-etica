import { unstable_setRequestLocale } from 'next-intl/server';

import { ensureDiaryFeatureRegistered } from '@/features/diary/feature/registerHost';
import { getDiaryRouteMount } from '@/registries/diaryRouteRegistry';

export const dynamic = 'force-dynamic';

type DiaryPageProps = {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DiaryPage(props: DiaryPageProps) {
  unstable_setRequestLocale(props.params.locale);
  ensureDiaryFeatureRegistered();

  const mount = getDiaryRouteMount('dashboard-diary');

  if (!mount) {
    throw new Error('DIARY_ROUTE_NOT_REGISTERED');
  }

  return mount({
    locale: props.params.locale,
    params: props.params,
    searchParams: props.searchParams ?? {},
  });
}
