'use client';

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
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
};

export const AvatarBadge = ({ avatar, fallback, size = 'md', className }: AvatarBadgeProps) => {
  const option = getAvatarOption(avatar);
  const gradient = option?.gradient ?? 'bg-gradient-to-br from-slate-500 to-slate-700';
  const fallbackLabel = fallback?.trim().slice(0, 2).toUpperCase() ?? '?';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shadow-inner',
        gradient,
        sizeClassNames[size],
        className,
      )}
      aria-hidden="true"
    >
      {option?.emoji ?? fallbackLabel}
    </span>
  );
};
