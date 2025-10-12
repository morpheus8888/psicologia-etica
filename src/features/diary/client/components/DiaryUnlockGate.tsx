'use client';

import { useState } from 'react';

import type { TranslationAdapter } from '@/features/diary/adapters/types';
import { useDiaryEncryption } from '@/features/diary/client/context/DiaryEncryptionContext';

type DiaryUnlockGateProps = {
  t: TranslationAdapter;
  children: React.ReactNode;
};

export const DiaryUnlockGate = ({ t, children }: DiaryUnlockGateProps) => {
  const encryption = useDiaryEncryption();
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password) {
      return;
    }

    if (encryption.status === 'needs-password') {
      await encryption.setup(password);
    } else {
      await encryption.unlock(password);
    }

    setPassword('');
  };

  if (encryption.status === 'ready') {
    return (
      <div>
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-6 px-4 py-10 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {encryption.status === 'needs-password'
            ? t.getNamespace('unlock').t('setupTitle')
            : t.getNamespace('unlock').t('unlockTitle')}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {encryption.status === 'needs-password'
            ? t.getNamespace('unlock').t('setupSubtitle')
            : t.getNamespace('unlock').t('unlockSubtitle')}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t.getNamespace('unlock').t('info')}
        </p>
      </div>

      {encryption.status === 'pending'
        ? (
            <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-dashed border-primary/40 text-sm text-primary">
              {t.getNamespace('unlock').t('pending')}
            </div>
          )
        : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                name="username"
                autoComplete="username"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
              <label className="text-left text-sm font-medium text-foreground" htmlFor="diary-password">
                {t.getNamespace('unlock').t('passwordLabel')}
              </label>
              <input
                id="diary-password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder={t.getNamespace('unlock').t('passwordPlaceholder')}
                autoComplete={
                  encryption.status === 'needs-password' ? 'new-password' : 'current-password'
                }
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
              {encryption.status === 'needs-password' && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
                  {t.getNamespace('unlock').t('warning')}
                </p>
              )}
              {encryption.error && (
                <p className="text-sm text-destructive">
                  {t.getNamespace('unlock').t(encryption.error)}
                </p>
              )}
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {encryption.status === 'needs-password'
                  ? t.getNamespace('unlock').t('setupCta')
                  : t.getNamespace('unlock').t('unlockCta')}
              </button>
            </form>
          )}
    </div>
  );
};
