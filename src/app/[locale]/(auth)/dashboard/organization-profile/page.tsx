import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { TitleBar } from '@/features/dashboard/TitleBar';

type Props = {
  params: { locale: string };
};

export default async function OrganizationProfilePage(props: Props) {
  unstable_setRequestLocale(props.params.locale);

  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'OrganizationProfile',
  });

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground shadow-sm">
        {t('info')}
      </div>
    </>
  );
}
