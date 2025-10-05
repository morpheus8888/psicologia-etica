'use client';

import { UserRound } from 'lucide-react';

import { getAvatarOption } from '@/utils/avatars';
import { cn } from '@/utils/Helpers';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarBadgeProps = {
  avatar?: string | null;
  fallback?: string | null;
  size?: AvatarSize;
  className?: string;
};

const sizeClassNames: Record<AvatarSize, string> = {
  sm: 'h-10 w-10 text-base',
  md: 'h-12 w-12 text-lg',
  lg: 'h-14 w-14 text-2xl',
};

export const AvatarBadge = ({ avatar, fallback, size = 'md', className }: AvatarBadgeProps) => {
  const option = getAvatarOption(avatar);
  const gradient = option?.gradient ?? 'bg-muted text-muted-foreground border border-border shadow-sm';
  const fallbackLabel = fallback?.trim().slice(0, 2).toUpperCase() ?? '?';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shadow-inner transition-colors duration-150',
        gradient,
        sizeClassNames[size],
        className,
      )}
      aria-hidden="true"
    >
      {option?.emoji ?? (
        <UserRound className="size-2/3" aria-hidden="true" focusable="false" strokeWidth={1.75} />
      ) ?? fallbackLabel}
    </span>
  );
};
