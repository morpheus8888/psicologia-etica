'use client';

/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  CryptoAdapter,
  DiaryKdfParams,
} from '@/features/diary/adapters/types';
import {
  diaryGetKeyring,
  diaryPutKeyring,
} from '@/features/diary/server/actions';

import {
  createMasterKey,
  importAesKey,
  unwrapMasterKey,
  wrapMasterKey,
} from '../cryptoUtils';

export type DiaryKeyringData = {
  encMasterKey: Uint8Array;
  salt: Uint8Array;
  kdfParams: DiaryKdfParams;
};

type MasterKeyHandle = {
  raw: Uint8Array;
  cryptoKey: CryptoKey;
};

type DiaryEncryptionContextValue = {
  status: 'needs-password' | 'locked' | 'ready' | 'pending';
  error: string | null;
  keyring: DiaryKeyringData | null;
  hasKey: boolean;
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  refresh: () => Promise<void>;
  getMasterKey: () => MasterKeyHandle;
};

const DiaryEncryptionContext = createContext<DiaryEncryptionContextValue | null>(null);

type DiaryEncryptionProviderProps = {
  initialKeyring: DiaryKeyringData | null;
  cryptoAdapter: CryptoAdapter;
  children: React.ReactNode;
};

export const DiaryEncryptionProvider = ({
  initialKeyring,
  cryptoAdapter,
  children,
}: DiaryEncryptionProviderProps) => {
  const [keyring, setKeyring] = useState<DiaryKeyringData | null>(initialKeyring);
  const [status, setStatus] = useState<DiaryEncryptionContextValue['status']>(
    initialKeyring ? 'locked' : 'needs-password',
  );
  const [error, setError] = useState<string | null>(null);

  const masterKeyRef = useRef<Uint8Array | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  const resetKeys = useCallback(() => {
    masterKeyRef.current = null;
    cryptoKeyRef.current = null;
  }, []);

  const setup = useCallback(
    async (password: string) => {
      setStatus('pending');
      setError(null);

      try {
        const masterKey = createMasterKey();
        const wrapped = await wrapMasterKey(cryptoAdapter, masterKey, password);

        await diaryPutKeyring(wrapped);

        masterKeyRef.current = masterKey;
        cryptoKeyRef.current = await importAesKey(masterKey);

        setKeyring({
          encMasterKey: wrapped.encMasterKey,
          salt: wrapped.salt,
          kdfParams: wrapped.kdfParams,
        });
        setStatus('ready');
      } catch (err) {
        console.error(err);
        resetKeys();
        setStatus(initialKeyring ? 'locked' : 'needs-password');
        setError('setup_failed');
      }
    },
    [cryptoAdapter, initialKeyring, resetKeys],
  );

  const unlock = useCallback(
    async (password: string) => {
      if (!keyring) {
        throw new Error('KEYRING_NOT_INITIALISED');
      }

      setStatus('pending');
      setError(null);

      try {
        const masterKey = await unwrapMasterKey({
          cryptoAdapter,
          encMasterKey: keyring.encMasterKey,
          salt: keyring.salt,
          kdfParams: keyring.kdfParams,
          password,
        });

        masterKeyRef.current = masterKey;
        cryptoKeyRef.current = await importAesKey(masterKey);
        setStatus('ready');
      } catch (err) {
        console.warn('Failed to unlock diary keyring', err);
        resetKeys();
        setStatus('locked');
        setError('invalid_password');
      }
    },
    [cryptoAdapter, keyring, resetKeys],
  );

  const lock = useCallback(() => {
    resetKeys();
    setStatus(keyring ? 'locked' : 'needs-password');
    setError(null);
  }, [keyring, resetKeys]);

  const refresh = useCallback(async () => {
    const next = await diaryGetKeyring();
    setKeyring(next);
    resetKeys();
    setStatus(next ? 'locked' : 'needs-password');
  }, [resetKeys]);

  const getMasterKey = useCallback(() => {
    const raw = masterKeyRef.current;
    const cryptoKey = cryptoKeyRef.current;

    if (!raw || !cryptoKey) {
      throw new Error('DIARY_LOCKED');
    }

    return { raw, cryptoKey };
  }, []);

  const value = useMemo<DiaryEncryptionContextValue>(
    () => ({
      status,
      error,
      keyring,
      hasKey: Boolean(cryptoKeyRef.current && masterKeyRef.current),
      setup,
      unlock,
      lock,
      refresh,
      getMasterKey,
    }),
    [status, error, keyring, setup, unlock, lock, refresh, getMasterKey],
  );

  return (
    <DiaryEncryptionContext.Provider value={value}>
      {children}
    </DiaryEncryptionContext.Provider>
  );
};

export const useDiaryEncryption = () => {
  const context = useContext(DiaryEncryptionContext);
  if (!context) {
    throw new Error('useDiaryEncryption must be used within DiaryEncryptionProvider');
  }
  return context;
};
