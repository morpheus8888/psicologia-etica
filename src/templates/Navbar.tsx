import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';

import { AccountMenu } from '@/components/AccountMenu';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { authOptions } from '@/libs/auth/config';
import { AppConfig } from '@/utils/AppConfig';
import { getI18nPath } from '@/utils/Helpers';

import { Logo } from './Logo';

type NavbarProps = {
  locale: string;
};

export const Navbar = async ({ locale }: NavbarProps) => {
  const [tHeader, session] = await Promise.all([
    getTranslations({ locale, namespace: 'header' }),
    getServerSession(authOptions),
  ]);

  const navigationItems = [
    {
      href: getI18nPath('/blog', locale),
      label: tHeader('blog'),
    },
    {
      href: getI18nPath('/vocabulary', locale),
      label: tHeader('vocabulary'),
    },
    {
      href: getI18nPath('/tests', locale),
      label: tHeader('tests'),
    },
    {
      href: getI18nPath('/services', locale),
      label: tHeader('services'),
    },
  ];

  const dashboardPath = getI18nPath('/dashboard', locale);
  const profilePath = getI18nPath('/dashboard/user-profile', locale);
  const settingsPath = getI18nPath('/dashboard/organization-profile', locale);

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <div className="flex items-center gap-8">
          <Link href={getI18nPath('/', locale)} aria-label={AppConfig.name}>
            <Logo />
          </Link>

          <nav aria-label={tHeader('navigationLabel')}>
            <ul className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              {navigationItems.map(item => (
                <li key={item.href}>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href={item.href}
                    prefetch={false}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <AccountMenu
            session={session}
            signInPath={getI18nPath('/sign-in', locale)}
            dashboardPath={dashboardPath}
            profilePath={profilePath}
            settingsPath={settingsPath}
            adminMembersPath={getI18nPath('/dashboard/admin/members', locale)}
            adminBlogPath={getI18nPath('/dashboard/admin/blog/new', locale)}
            adminVocabularyPath={getI18nPath('/dashboard/admin/vocabulary/new', locale)}
          />
        </div>
      </div>
    </header>
  );
};
