import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Logo } from '@/components/Logo';
import { authOptions } from '@/libs/auth/config';
import { getI18nPath } from '@/utils/Helpers';

export async function SiteHeader(props: { locale: string }) {
  const [t, session] = await Promise.all([
    getTranslations({ locale: props.locale, namespace: 'header' }),
    getServerSession(authOptions),
  ]);

  const navItems = [
    { href: '/blog', label: t('blog') },
    { href: '/vocabulary', label: t('vocabulary') },
    { href: '/tests', label: t('tests') },
    { href: '/services', label: t('services') },
  ];

  const accountHref = session?.user
    ? getI18nPath('/dashboard', props.locale)
    : getI18nPath('/sign-in', props.locale);
  const accountLabel = session?.user ? t('account') : t('signIn');

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href={getI18nPath('/', props.locale)} className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={getI18nPath(item.href, props.locale)}
              prefetch={false}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Link
            href={accountHref}
            className="rounded-md border border-input px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            {accountLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
