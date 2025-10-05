'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { AvatarBadge } from '@/components/AvatarBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AccountMenuProps = {
  session: Session | null;
  signInPath: string;
  dashboardPath: string;
  profilePath: string;
  settingsPath: string;
  adminMembersPath: string;
  adminBlogPath: string;
  adminVocabularyPath: string;
};

export const AccountMenu = ({
  session,
  signInPath,
  dashboardPath,
  profilePath,
  settingsPath,
  adminMembersPath,
  adminBlogPath,
  adminVocabularyPath,
}: AccountMenuProps) => {
  const router = useRouter();
  const t = useTranslations('UserMenu');

  const userName = session?.user?.name ?? session?.user?.email ?? '';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';
  const isAdmin = session?.user?.role === 'admin';
  const avatarValue = session?.user?.avatar ?? null;

  const handleSignOut = () => {
    void signOut({ callbackUrl: signInPath });
  };

  const handleLogin = () => {
    router.push(signInPath);
  };

  if (!session) {
    return (
      <button
        type="button"
        onClick={handleLogin}
        aria-label={t('login')}
        className="group relative flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
      >
        <AvatarBadge avatar={null} fallback="?" size="lg" className="bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 text-primary shadow-sm transition-transform duration-200 group-hover:scale-105" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('account_trigger')}
          className="group relative flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
        >
          <AvatarBadge avatar={avatarValue} fallback={userInitial} size="lg" className="transition-transform duration-200 group-hover:scale-105" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="flex items-center gap-3 px-3 py-2 text-sm">
          <AvatarBadge avatar={avatarValue} fallback={userInitial} size="sm" />
          <div>
            <p className="font-medium text-foreground">{userName || t('anonymous')}</p>
            {session.user?.email && (
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={dashboardPath}>{t('dashboard')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={profilePath}>{t('profile')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={settingsPath}>{t('settings')}</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('admin_panel')}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={adminMembersPath}>{t('admin_members')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={adminBlogPath}>{t('admin_blog_new')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={adminVocabularyPath}>{t('admin_vocabulary_new')}</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            handleSignOut();
          }}
        >
          {t('sign_out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
