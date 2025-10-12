'use client';

import {
  BookOpen,
  Briefcase,
  FlaskConical,
  Home as HomeIcon,
  type LucideIcon,
  NotebookPen,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AccountMenu } from '@/components/AccountMenu';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/utils/Helpers';

import { Logo } from './Logo';

type NavKey = 'home' | 'blog' | 'vocabulary' | 'tests' | 'services';

type NavbarClientProps = {
  navLabel: string;
  brandLabel: string;
  navItems: Array<{
    key: NavKey;
    href: string;
    label: string;
  }>;
  session: Session | null;
  signInPath: string;
  dashboardPath: string;
  profilePath: string;
  settingsPath: string;
  adminMembersPath: string;
  adminBlogPath: string;
  adminVocabularyPath: string;
  locale: string;
  accountMenuId?: string;
};

const iconMap: Record<NavKey, LucideIcon> = {
  home: HomeIcon,
  blog: NotebookPen,
  vocabulary: BookOpen,
  tests: FlaskConical,
  services: Briefcase,
};

const colorMap: Record<NavKey, string> = {
  home: 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-200',
  blog: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-200',
  vocabulary: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-200',
  tests: 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-200',
  services: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-200',
};

export function NavbarClient(props: NavbarClientProps) {
  const pathname = usePathname();
  const lastScrollY = useRef(0);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;

      if (current <= 24) {
        setIsHidden(false);
        lastScrollY.current = current;
        return;
      }

      if (current > lastScrollY.current + 8) {
        setIsHidden(true);
      } else if (current < lastScrollY.current - 8) {
        setIsHidden(false);
      }

      lastScrollY.current = current;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeMap = useMemo(() => {
    const currentPath = pathname ?? '/';

    return props.navItems.reduce<Record<NavKey, boolean>>(
      (acc, item) => {
        if (item.key === 'home') {
          acc.home = currentPath === item.href;
          return acc;
        }

        acc[item.key] = currentPath.startsWith(item.href);
        return acc;
      },
      {
        home: false,
        blog: false,
        vocabulary: false,
        tests: false,
        services: false,
      },
    );
  }, [pathname, props.navItems]);

  const homeHref = props.navItems.find(item => item.key === 'home')?.href ?? '/';

  return (
    <div
      className={cn(
        'sticky top-0 z-50 transition-transform duration-300',
        isHidden ? '-translate-y-full' : 'translate-y-0',
      )}
    >
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={homeHref}
                aria-label={props.brandLabel}
                className="hidden items-center gap-2 sm:flex"
              >
                <Logo />
              </Link>
              <Link
                href={homeHref}
                aria-label={props.brandLabel}
                className="flex items-center justify-center rounded-lg border border-transparent p-2 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
              >
                <HomeIcon className="size-5" aria-hidden />
              </Link>
            </div>

            <nav aria-label={props.navLabel} className="hidden flex-1 justify-center lg:flex">
              <ul className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-2 py-1 shadow-sm backdrop-blur">
                {props.navItems.map((item) => {
                  const Icon = iconMap[item.key];
                  const isActive = activeMap[item.key];

                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isActive
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                        <span className="leading-tight">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
              <AccountMenu
                session={props.session}
                signInPath={props.signInPath}
                dashboardPath={props.dashboardPath}
                profilePath={props.profilePath}
                settingsPath={props.settingsPath}
                adminMembersPath={props.adminMembersPath}
                adminBlogPath={props.adminBlogPath}
                adminVocabularyPath={props.adminVocabularyPath}
                locale={props.locale}
                menuId={props.accountMenuId}
              />
            </div>
          </div>

          <nav aria-label={props.navLabel} className="lg:hidden">
            <ul className="grid w-full grid-cols-5 gap-2">
              {props.navItems.map((item) => {
                const Icon = iconMap[item.key];
                const isActive = activeMap[item.key];

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        colorMap[item.key],
                        isActive
                          ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                          : 'opacity-90 hover:opacity-100 active:scale-[0.98]',
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                      <span className="leading-none text-current">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
