import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

type PageProps = {
  params: { locale: string };
};

export async function generateMetadata({ params }: PageProps) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'testsPage',
  });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function TestsPage({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);

  const t = await getTranslations({
    locale: params.locale,
    namespace: 'testsPage',
  });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{t('title')}</h1>
        <p className="max-w-2xl text-base text-muted-foreground">{t('description')}</p>
      </header>

      <section className="rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
        {t('underConstruction')}
      </section>
    </div>
  );
}
