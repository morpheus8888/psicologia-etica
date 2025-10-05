import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { authOptions } from '@/libs/auth/config';
import { getI18nPath } from '@/utils/Helpers';

type PageProps = {
  params: { locale: string };
};

export default async function AdminVocabularyNewPage({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);

  const [t, session] = await Promise.all([
    getTranslations({ locale: params.locale, namespace: 'AdminVocabularyNew' }),
    getServerSession(authOptions),
  ]);

  if (session?.user?.role !== 'admin') {
    redirect(getI18nPath('/dashboard', params.locale));
  }

  return (
    <div className="space-y-8">
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground shadow">
        {t('placeholder')}
      </div>
    </div>
  );
}
