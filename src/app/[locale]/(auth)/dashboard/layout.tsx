import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { DashboardHeader } from '@/features/dashboard/DashboardHeader';
import { authOptions } from '@/libs/auth/config';
import { getI18nPath } from '@/utils/Helpers';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'Dashboard',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(props.params.locale);

  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'DashboardLayout',
  });
  const session = await getServerSession(authOptions);

  const menu = [
    {
      href: getI18nPath('/dashboard', props.params.locale),
      label: t('home'),
    },
    {
      href: getI18nPath(
        '/dashboard/organization-profile/organization-members',
        props.params.locale,
      ),
      label: t('members'),
    },
    {
      href: getI18nPath('/dashboard/organization-profile', props.params.locale),
      label: t('settings'),
    },
  ];

  return (
    <>
      <div className="shadow-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-3 py-4">
          <DashboardHeader
            locale={props.params.locale}
            menu={menu}
            session={session}
          />
        </div>
      </div>

      <div className="min-h-[calc(100vh-72px)] bg-muted">
        <div className="mx-auto max-w-screen-xl px-3 pb-16 pt-6">
          {props.children}
        </div>
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';
