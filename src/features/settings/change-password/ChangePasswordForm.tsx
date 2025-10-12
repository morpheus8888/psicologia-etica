'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { changePasswordAction } from '@/app/[locale]/(auth)/dashboard/settings/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type ChangePasswordFormState,
  changePasswordInitialState,
} from '@/features/settings/change-password/form-state';

const PASSWORD_ERROR_KEYS = [
  'required',
  'min_length',
  'invalid_current',
  'mismatch',
  'same_password',
] as const;

type PasswordErrorKey = typeof PASSWORD_ERROR_KEYS[number];

type ChangePasswordFormProps = {
  locale: string;
};

const SubmitButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('SettingsPage.security');

  return (
    <Button type="submit" disabled={pending}>
      {pending ? t('actions.saving') : t('actions.save')}
    </Button>
  );
};

export const ChangePasswordForm = ({ locale }: ChangePasswordFormProps) => {
  const t = useTranslations('SettingsPage.security');
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useFormState<ChangePasswordFormState, FormData>(
    changePasswordAction,
    changePasswordInitialState,
  );
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    if (state.status === 'success') {
      setSuccessVisible(true);
      formRef.current?.reset();
      const timer = window.setTimeout(() => setSuccessVisible(false), 4000);
      return () => window.clearTimeout(timer);
    }
    if (state.status === 'error') {
      setSuccessVisible(false);
    }
    return undefined;
  }, [state]);

  const fieldError = (field: string) => {
    const errorKey = state.fieldErrors?.[field];

    if (!errorKey) {
      return null;
    }

    if (!PASSWORD_ERROR_KEYS.includes(errorKey as PasswordErrorKey)) {
      return null;
    }

    const translationKey: `errors.${PasswordErrorKey}` = `errors.${
      errorKey as PasswordErrorKey
    }`;

    return t(translationKey);
  };

  const generalMessage = (() => {
    if (state.status === 'success') {
      return t('messages.success');
    }

    if (!state.message) {
      return null;
    }

    if (state.message === 'no_password') {
      return t('messages.no_password');
    }
    if (state.message === 'unauthenticated') {
      return t('messages.unauthenticated');
    }
    if (state.message === 'unknown_error') {
      return t('messages.error');
    }
    if (state.message === 'validation_error') {
      return t('messages.validation');
    }

    return null;
  })();

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t('fields.current')}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={fieldError('currentPassword') ? 'current-password-error' : undefined}
        />
        {fieldError('currentPassword') && (
          <p className="text-xs text-destructive" id="current-password-error">
            {fieldError('currentPassword')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">{t('fields.new')}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby={fieldError('newPassword') ? 'new-password-error' : undefined}
        />
        {fieldError('newPassword') && (
          <p className="text-xs text-destructive" id="new-password-error">
            {fieldError('newPassword')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('fields.confirm')}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby={fieldError('confirmPassword') ? 'confirm-password-error' : undefined}
        />
        {fieldError('confirmPassword') && (
          <p className="text-xs text-destructive" id="confirm-password-error">
            {fieldError('confirmPassword')}
          </p>
        )}
      </div>

      <div>
        <SubmitButton />
      </div>

      {state.status === 'success' && successVisible && (
        <Alert className="border-emerald-300 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-400">
          <AlertTitle>{t('messages.success')}</AlertTitle>
        </Alert>
      )}

      {generalMessage && state.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>{t('messages.validation')}</AlertTitle>
          <AlertDescription>{generalMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  );
};
