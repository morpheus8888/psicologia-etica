import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

export default async function OrganizationSelectionPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'dashboard.Onboarding' });

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-semibold">{t('selection_title')}</h1>
      <p className="text-muted-foreground">{t('selection_description')}</p>
    </div>
  );
}

export const dynamic = 'force-dynamic';
