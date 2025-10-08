'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { updateProfileAction } from '@/app/[locale]/(auth)/dashboard/user-profile/actions';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type ProfileFormState,
  profileInitialState,
} from '@/features/profile/form-state';
import { avatarOptions, type AvatarValue } from '@/utils/avatars';
import { cn } from '@/utils/Helpers';

const PROFILE_ERROR_KEYS = [
  'required',
  'max_100',
  'max_190',
  'max_32',
  'invalid_email',
  'invalid_phone',
  'invalid_avatar',
  'invalid_locale',
  'email_taken',
  'validation_error',
] as const;

type ProfileErrorKey = typeof PROFILE_ERROR_KEYS[number];

function isProfileErrorKey(value: string): value is ProfileErrorKey {
  return PROFILE_ERROR_KEYS.includes(value as ProfileErrorKey);
}

type UserProfileFormProps = {
  locale: string;
  user: {
    firstName: string;
    familyName: string | null;
    email: string;
    phoneNumber: string | null;
    avatar: string | null;
  };
};

export const UserProfileForm = ({ locale, user }: UserProfileFormProps) => {
  const t = useTranslations('UserProfile');
  const [state, formAction] = useFormState<ProfileFormState, FormData>(
    updateProfileAction,
    profileInitialState,
  );
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarValue | null>(
    () => (user.avatar as AvatarValue | null) ?? null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const avatarLabelMap = useMemo(() => {
    return avatarOptions.reduce<Record<AvatarValue, string>>((acc, option) => {
      acc[option.value] = t(option.labelKey);
      return acc;
    }, {} as Record<AvatarValue, string>);
  }, [t]);

  useEffect(() => {
    if (state.status === 'success') {
      setSuccessMessage(t('form.success'));
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
    if (state.status === 'error' && state.message === 'email_taken') {
      setSuccessMessage(null);
    }
    return undefined;
  }, [state, t]);

  const fieldError = (field: string) => {
    const errorCode = state.fieldErrors?.[field];

    if (!errorCode || !isProfileErrorKey(errorCode)) {
      return null;
    }

    return t(`form.errors.${errorCode}` satisfies `form.errors.${ProfileErrorKey}`);
  };

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">{t('form.identity_heading')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('form.first_name')}</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={user.firstName}
              required
              maxLength={100}
              aria-describedby={fieldError('firstName') ? 'firstName-error' : undefined}
            />
            {fieldError('firstName') && (
              <p className="text-xs text-destructive" id="firstName-error">
                {fieldError('firstName')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t('form.last_name')}</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={user.familyName ?? ''}
              maxLength={100}
              aria-describedby={fieldError('lastName') ? 'lastName-error' : undefined}
            />
            {fieldError('lastName') && (
              <p className="text-xs text-destructive" id="lastName-error">
                {fieldError('lastName')}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">{t('form.contact_heading')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">{t('form.email')}</Label>
            <Input
              id="email"
              type="email"
              name="email"
              defaultValue={user.email}
              required
              maxLength={190}
              aria-describedby={fieldError('email') ? 'email-error' : undefined}
            />
            {fieldError('email') && (
              <p className="text-xs text-destructive" id="email-error">
                {fieldError('email')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('form.phone')}</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={user.phoneNumber ?? ''}
              maxLength={32}
              placeholder={t('form.phone_placeholder')}
              aria-describedby={fieldError('phone') ? 'phone-error' : undefined}
            />
            {fieldError('phone') && (
              <p className="text-xs text-destructive" id="phone-error">
                {fieldError('phone')}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('form.avatar')}</h2>
            <p className="text-sm text-muted-foreground">{t('form.avatar_hint')}</p>
          </div>
          <AvatarBadge
            avatar={selectedAvatar}
            fallback={selectedAvatar ? user.firstName : null}
            size="md"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border bg-background px-4 py-3 transition hover:border-primary/40 hover:shadow-sm',
              selectedAvatar === null ? 'border-primary ring-2 ring-primary/40' : 'border-border',
            )}
          >
            <input
              type="radio"
              name="avatarChoice"
              value=""
              checked={selectedAvatar === null}
              onChange={() => setSelectedAvatar(null)}
              className="sr-only"
            />
            <AvatarBadge avatar={null} size="sm" />
            <span className="text-sm font-medium text-foreground">
              {t('form.avatar_none')}
            </span>
          </label>
          {avatarOptions.map((option) => {
            const isActive = selectedAvatar === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border bg-background px-4 py-3 transition hover:border-primary/40 hover:shadow-sm',
                  isActive ? 'border-primary ring-2 ring-primary/40' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="avatarChoice"
                  value={option.value}
                  checked={isActive}
                  onChange={() => setSelectedAvatar(option.value)}
                  className="sr-only"
                />
                <AvatarBadge avatar={option.value} fallback={user.firstName} size="sm" />
                <span className="text-sm font-medium text-foreground">{avatarLabelMap[option.value]}</span>
              </label>
            );
          })}
        </div>
      </section>

      <Input type="hidden" name="avatar" value={selectedAvatar ?? ''} readOnly />
      <Input type="hidden" name="locale" value={locale} readOnly />

      {state.status === 'error' && state.message && state.message !== 'email_taken' && (
        <p className="text-sm text-destructive">{t('form.error')}</p>
      )}
      {state.fieldErrors?.email === 'email_taken' && (
        <p className="text-sm text-destructive">{t('form.email_taken')}</p>
      )}
      {successMessage && (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      )}

      <SubmitButton label={t('form.submit')} savingLabel={t('form.saving')} />
    </form>
  );
};

type SubmitButtonProps = {
  label: string;
  savingLabel: string;
};

function SubmitButton({ label, savingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="px-6 py-2 text-sm font-medium">
      {pending ? savingLabel : label}
    </Button>
  );
}
