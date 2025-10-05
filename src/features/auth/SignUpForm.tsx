'use client';

import { Loader2, LockKeyhole, Mail, Signature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getI18nPath } from '@/utils/Helpers';

type ErrorKey = 'email_in_use' | 'unknown_error' | 'password_requirement';

type SignUpResponse = {
  error?: string;
};

export function SignUpForm() {
  const t = useTranslations('auth.SignUp');
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasError = Boolean(errorKey);
  const errorMessage = errorKey ? t(errorKey) : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setErrorKey('password_requirement');
      return;
    }

    setErrorKey(null);

    startTransition(async () => {
      const trimmedName = name.trim();
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName.length > 0 ? trimmedName : undefined,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as SignUpResponse;
        if (response.status === 409 || data.error === 'EMAIL_EXISTS') {
          setErrorKey('email_in_use');
          return;
        }
        setErrorKey('unknown_error');
        return;
      }

      const signInResponse = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResponse?.error) {
        setErrorKey('unknown_error');
        return;
      }

      const homePath = getI18nPath('/', locale);
      router.replace(homePath);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-describedby={errorMessage ? 'sign-up-error' : undefined}
      noValidate
    >
      {errorMessage && (
        <Alert variant="destructive" role="alert" aria-live="polite" id="sign-up-error">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="signup-name">{t('name_label')}</Label>
        <div className="relative">
          <Input
            id="signup-name"
            type="text"
            placeholder={t('name_placeholder')}
            value={name}
            onChange={event => setName(event.target.value)}
            aria-invalid={hasError ? true : undefined}
            className="pl-10"
          />
          <Signature className="absolute inset-y-0 left-2 my-auto size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">{t('email_label')}</Label>
        <div className="relative">
          <Input
            id="signup-email"
            type="email"
            autoComplete="username"
            placeholder={t('email_placeholder')}
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
            aria-invalid={hasError ? true : undefined}
            className="pl-10"
          />
          <Mail className="absolute inset-y-0 left-2 my-auto size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">{t('password_label')}</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('password_placeholder')}
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
            aria-invalid={hasError ? true : undefined}
            className="pl-10"
          />
          <LockKeyhole className="absolute inset-y-0 left-2 my-auto size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
        {t('submit')}
      </Button>
    </form>
  );
}
