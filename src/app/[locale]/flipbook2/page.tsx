import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { Flipbook2Demo } from '@/features/flipbook2';
import { Navbar } from '@/templates/Navbar';

type PageProps = {
  params: { locale: string };
};

export default async function Flipbook2Page({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: 'Flipbook2Page' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar locale={params.locale} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{t('badge')}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('description')}
          </p>
        </header>

        <Flipbook2Demo locale={params.locale} />
      </main>
    </div>
  );
}
