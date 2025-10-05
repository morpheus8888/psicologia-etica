'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { useEffect, useState, useTransition } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getI18nPath } from '@/utils/Helpers';

type ErrorKey = 'invalid_credentials';

export function SignInForm() {
  const t = useTranslations('auth.SignIn');
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const errorParam = params.get('error');
    if (errorParam && errorParam !== 'null') {
      setErrorKey('invalid_credentials');
    }
  }, [params]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);

    startTransition(async () => {
      const response = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!response || response.error) {
        setErrorKey('invalid_credentials');
        return;
      }

      const homePath = getI18nPath('/', locale);
      router.replace(homePath);
      router.refresh();
    });
  }

  const hasError = Boolean(errorKey);
  const PasswordIcon = showPassword ? EyeOff : Eye;
  const errorMessage = errorKey ? t(errorKey) : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-describedby={errorMessage ? 'sign-in-error' : undefined}
      noValidate
    >
      {errorMessage && (
        <Alert
          variant="destructive"
          role="alert"
          aria-live="polite"
          data-testid="signin-error"
          id="sign-in-error"
        >
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t('email_label')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder={t('email_placeholder')}
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
          aria-invalid={hasError ? true : undefined}
          data-testid="signin-email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('password_label')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('password_placeholder')}
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
            aria-invalid={hasError ? true : undefined}
            data-testid="signin-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? t('hide_password') : t('show_password')}
            data-testid="signin-password-toggle"
          >
            <PasswordIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending}
        data-testid="signin-submit"
      >
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
        {t('submit')}
      </Button>
    </form>
  );
}
