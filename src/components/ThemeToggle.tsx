'use client';

import { MoonStar, SunMedium } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations('header');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextTheme = (resolvedTheme ?? theme) === 'dark' ? 'light' : 'dark';
  const label = mounted
    ? (nextTheme === 'dark' ? t('theme_toggle_dark') : t('theme_toggle_light'))
    : t('theme_toggle');

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      className="size-10 rounded-full border border-border/60 bg-background/80 text-foreground transition hover:border-primary/50 hover:text-primary"
      onClick={() => setTheme(nextTheme)}
    >
      {mounted && (resolvedTheme ?? theme) === 'dark'
        ? <SunMedium className="size-5" aria-hidden />
        : <MoonStar className="size-5" aria-hidden />}
    </Button>
  );
}
