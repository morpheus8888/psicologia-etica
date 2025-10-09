import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { ChangePasswordForm } from '@/features/settings/change-password/ChangePasswordForm';
import { authOptions } from '@/libs/auth/config';
import { listSettingsSections } from '@/registries/settingsRegistry';
import { getI18nPath } from '@/utils/Helpers';

type SettingsPageProps = {
  params: { locale: string };
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = params;
  unstable_setRequestLocale(locale);

  const session = await getServerSession(authOptions);

  const userId = session?.user?.id;

  if (!userId) {
    redirect(getI18nPath('/sign-in', locale));
  }

  const t = await getTranslations({ locale, namespace: 'SettingsPage' });

  const sections = listSettingsSections()
    .map(entry => entry.resolve({
      locale,
      userId,
    }))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </header>

      <section className="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            {t('security.heading')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('security.description')}
          </p>
        </div>
        <ChangePasswordForm locale={locale} />
      </section>

      {sections.map(section => (
        <section
          key={section.title}
          className="space-y-4 rounded-xl border bg-background p-6 shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
          <div>{section.render()}</div>
        </section>
      ))}
    </div>
  );
}

export const dynamic = 'force-dynamic';
