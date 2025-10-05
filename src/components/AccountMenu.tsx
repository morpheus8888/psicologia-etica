'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AccountMenuProps = {
  session: Session | null;
  signInPath: string;
  profilePath: string;
  settingsPath: string;
};

export const AccountMenu = ({ session, signInPath, profilePath, settingsPath }: AccountMenuProps) => {
  const router = useRouter();
  const t = useTranslations('UserMenu');

  const userName = session?.user?.name ?? session?.user?.email ?? '';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

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
        className="flex size-9 items-center justify-center rounded-full border border-border bg-muted font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground"
      >
        ?
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('account_trigger')}
          className="flex size-9 items-center justify-center rounded-full bg-muted font-semibold uppercase text-foreground"
        >
          {userInitial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{userName || t('anonymous')}</p>
          {session.user?.email && (
            <p className="text-xs text-muted-foreground">{session.user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profilePath}>{t('profile')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={settingsPath}>{t('settings')}</Link>
        </DropdownMenuItem>
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
