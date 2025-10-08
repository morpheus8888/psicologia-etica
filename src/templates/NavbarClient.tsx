'use client';

import {
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
import { cn } from '@/utils/Helpers';

import { Logo } from './Logo';

type NavKey = 'home' | 'blog' | 'tests' | 'services';

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
};

const iconMap: Record<NavKey, LucideIcon> = {
  home: HomeIcon,
  blog: NotebookPen,
  tests: FlaskConical,
  services: Briefcase,
};

const colorMap: Record<NavKey, string> = {
  home: 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-200',
  blog: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-200',
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
      { home: false, blog: false, tests: false, services: false },
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href={homeHref} aria-label={props.brandLabel} className="flex items-center gap-2">
            <Logo isTextHidden />
            <span className="hidden text-sm font-semibold text-foreground sm:inline">
              {props.brandLabel}
            </span>
          </Link>

          <nav aria-label={props.navLabel} className="flex flex-1 justify-center">
            <ul className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2 py-1 shadow-sm backdrop-blur">
              {props.navItems.map((item) => {
                const Icon = iconMap[item.key];
                const isActive = activeMap[item.key];

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      aria-label={item.label}
                      className={cn(
                        'flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2',
                        colorMap[item.key],
                        isActive
                          ? 'ring-2 ring-offset-2 ring-primary/50 ring-offset-background'
                          : 'opacity-90 hover:opacity-100',
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                      <span className="hidden text-[10px] text-current sm:block">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <AccountMenu
              session={props.session}
              signInPath={props.signInPath}
              dashboardPath={props.dashboardPath}
              profilePath={props.profilePath}
              settingsPath={props.settingsPath}
              adminMembersPath={props.adminMembersPath}
              adminBlogPath={props.adminBlogPath}
              adminVocabularyPath={props.adminVocabularyPath}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
