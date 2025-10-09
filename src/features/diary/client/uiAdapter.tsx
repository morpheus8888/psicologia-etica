'use client';

/* eslint-disable react-refresh/only-export-components */

import type { ReactNode } from 'react';

import type { UIAdapter } from '@/features/diary/adapters/types';
import { cn } from '@/utils/Helpers';

type SimpleContainerProps = {
  children: ReactNode;
  className?: string;
};

const FragmentContainer = ({ children }: SimpleContainerProps) => (
  <>{children}</>
);

const noop = () => {};

const isClient = () => typeof window !== 'undefined';

export const uiAdapter: UIAdapter = {
  popover: {
    Root: ({ children }) => <div className="relative inline-flex">{children}</div>,
    Trigger: ({ children }) => <div className="inline-flex">{children}</div>,
    Content: ({ children, className }) => (
      <div className={cn('absolute z-20 mt-2 rounded-lg border bg-popover p-3 shadow-lg', className)}>
        {children}
      </div>
    ),
  },
  dialog: {
    Root: ({ children }) => <>{children}</>,
    Trigger: FragmentContainer,
    Content: ({ children, className }) => (
      <div className={cn('fixed inset-0 z-40 flex items-center justify-center bg-black/40', className)}>
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-2xl">
          {children}
        </div>
      </div>
    ),
  },
  bottomSheet: {
    Root: ({ children }) => <>{children}</>,
    Trigger: FragmentContainer,
    Content: ({ children, className }) => (
      <div className={cn('fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background p-4 shadow-2xl', className)}>
        {children}
      </div>
    ),
  },
  calendar: ({ selectedDate, onSelect }) => (
    <input
      type="date"
      value={selectedDate ? selectedDate.toISOString().slice(0, 10) : ''}
      onChange={(event) => {
        const value = event.target.value;
        onSelect(value ? new Date(`${value}T00:00:00`) : null);
      }}
      className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground shadow-sm"
    />
  ),
  heatmap: ({ data, onSelect }) => (
    <div className="flex flex-wrap gap-1">
      {data.map(item => (
        <button
          key={item.dateISO}
          type="button"
          onClick={() => onSelect?.(item.dateISO)}
          className={cn(
            'h-8 w-8 rounded-md text-xs font-medium transition',
            item.value > 0
              ? 'bg-primary/80 text-primary-foreground hover:bg-primary'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {item.dateISO.split('-').at(-1)}
        </button>
      ))}
    </div>
  ),
  iconButton: ({ icon, label, onClick, variant = 'default', disabled, className }) => (
    <button
      type="button"
      onClick={onClick ?? noop}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        variant === 'ghost' && 'border-transparent bg-transparent text-foreground hover:bg-muted',
        variant === 'primary' && 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'default' && 'border-border bg-background text-foreground hover:bg-muted',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      {icon}
    </button>
  ),
  tooltip: {
    Root: FragmentContainer,
    Trigger: FragmentContainer,
    Content: ({ children, className }) => (
      <div className={cn('rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow', className)}>
        {children}
      </div>
    ),
  },
  toast: ({ title, description }) => {
    if (!isClient()) {
      return;
    }

    const message = description ? `${title}\n\n${description}` : title;
    // eslint-disable-next-line no-alert
    window.alert(message);
  },
  isDesktop() {
    if (!isClient()) {
      return true;
    }

    return window.matchMedia('(min-width: 768px)').matches;
  },
  themeTokens: {
    card: 'bg-card text-card-foreground',
    surface: 'bg-muted text-foreground',
    shadow: 'shadow-xl',
  },
};
