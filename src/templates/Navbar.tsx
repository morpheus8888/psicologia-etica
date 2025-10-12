import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';

import { authOptions } from '@/libs/auth/config';
import { AppConfig } from '@/utils/AppConfig';
import { getI18nPath } from '@/utils/Helpers';

import { NavbarClient } from './NavbarClient';

type NavbarProps = {
  locale: string;
};

export const Navbar = async ({ locale }: NavbarProps) => {
  const [tHeader, session] = await Promise.all([
    getTranslations({ locale, namespace: 'header' }),
    getServerSession(authOptions),
  ]);

  const dashboardPath = getI18nPath('/dashboard', locale);
  const profilePath = getI18nPath('/dashboard/user-profile', locale);
  const settingsPath = getI18nPath('/dashboard/settings', locale);

  const navItems = [
    {
      key: 'home' as const,
      href: getI18nPath('/', locale),
      label: tHeader('home'),
    },
    {
      key: 'blog' as const,
      href: getI18nPath('/blog', locale),
      label: tHeader('blog'),
    },
    {
      key: 'vocabulary' as const,
      href: getI18nPath('/vocabulary', locale),
      label: tHeader('vocabulary'),
    },
    {
      key: 'tests' as const,
      href: getI18nPath('/tests', locale),
      label: tHeader('tests'),
    },
    {
      key: 'services' as const,
      href: getI18nPath('/services', locale),
      label: tHeader('services'),
    },
  ];

  return (
    <NavbarClient
      navLabel={tHeader('navigationLabel')}
      brandLabel={AppConfig.name}
      navItems={navItems}
      session={session}
      signInPath={getI18nPath('/sign-in', locale)}
      dashboardPath={dashboardPath}
      profilePath={profilePath}
      settingsPath={settingsPath}
      adminMembersPath={getI18nPath('/dashboard/admin/members', locale)}
      adminBlogPath={getI18nPath('/dashboard/admin/blog/new', locale)}
      adminVocabularyPath={getI18nPath('/dashboard/admin/vocabulary/new', locale)}
      locale={locale}
      accountMenuId="account-menu"
    />
  );
};
