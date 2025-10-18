import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { useDiaryData } from '@/features/diary/client/context/DiaryDataContext';
import type { useDiaryEncryption } from '@/features/diary/client/context/DiaryEncryptionContext';
import type { useDiaryNavigation } from '@/features/diary/client/context/DiaryNavigationContext';
import { cryptoAdapter } from '@/features/diary/client/cryptoAdapter';
import { decryptPayload, encryptPayload } from '@/features/diary/client/cryptoUtils';

const SAVE_DEBOUNCE_MS = 10000;
const DRAFT_STORAGE_KEY_PREFIX = 'diary::draft::';
const DRAFT_STORAGE_VERSION = 1;

const getDraftStorageKey = (dateISO: string) => `${DRAFT_STORAGE_KEY_PREFIX}${dateISO}`;

const encodeBytesToBase64 = (bytes: Uint8Array) => {
  if (typeof window === 'undefined') {
    throw new TypeError('BASE64_UNAVAILABLE');
  }
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return window.btoa(binary);
};

const decodeBase64ToBytes = (value: string) => {
  if (typeof window === 'undefined') {
    throw new TypeError('BASE64_UNAVAILABLE');
  }
  const binary = window.atob(value);
  const buffer = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    buffer[index] = binary.charCodeAt(index);
  }
  return buffer;
};

type DraftStoragePayload = {
  version: number;
  updatedAt: string;
  encrypted: boolean;
  ciphertext?: string;
  nonce?: string;
  body?: string;
};

export type DraftSnapshot = {
  body: string;
  updatedAt: number;
};

type IncrementCounterKey =
  | 'editorUser'
  | 'editorExternal'
  | 'editorSuppressed'
  | 'editorComposition'
  | 'flipInit'
  | 'flipEvents'
  | 'flipUpdates'
  | 'flipUpdatesSkipped'
  | 'draftsSaved'
  | 'draftsLoaded'
  | 'savesQueued'
  | 'savesFlushed'
  | 'ensurePassiveApplied'
  | 'ensurePassiveSkipped'
  | 'navigationChanges'
  | 'stuckEvents';

type LogDebug = (label: string, details?: Record<string, unknown>, includeSnapshot?: boolean) => void;

type DiaryDataValue = ReturnType<typeof useDiaryData>;
type NavigationValue = ReturnType<typeof useDiaryNavigation>;
type EncryptionValue = ReturnType<typeof useDiaryEncryption>;
type SaveEntryResult = Awaited<ReturnType<DiaryDataValue['saveEntry']>>;

type UseDiaryEntrySessionParams = {
  data: DiaryDataValue;
  navigation: NavigationValue;
  encryption: EncryptionValue;
  incrementCounter: (key: IncrementCounterKey) => void;
  logDebug: LogDebug;
  scheduleFlipRefresh: () => void;
  scheduleDebugStuckCheck: () => void;
  debugLastUserInputRef: MutableRefObject<number>;
  isCurrentPageEditable: () => boolean;
};

type UseDiaryEntrySessionResult = {
  currentBody: string;
  currentEntryId: string | null;
  setCurrentEntryId: Dispatch<SetStateAction<string | null>>;
  currentBodyRef: MutableRefObject<string>;
  isDirtyRef: MutableRefObject<boolean>;
  suppressEditorOnChangeRef: MutableRefObject<boolean>;
  externalChangeOriginRef: MutableRefObject<'remote' | 'draft' | 'reset' | null>;
  pendingSaveValueRef: MutableRefObject<{ dateISO: string; body: string } | null>;
  lastLocalEditRef: MutableRefObject<number>;
  lastRemoteUpdateRef: MutableRefObject<number>;
  volatileDraftsRef: MutableRefObject<Map<string, DraftSnapshot>>;
  getOrInitEditorVersion: (dateISO: string) => number;
  bumpEditorVersion: (dateISO: string, reason: string) => number;
  handleSaveEntry: (bodyOverride?: string, dateOverride?: string) => Promise<SaveEntryResult | null>;
  enqueueSave: (dateISO: string, body: string) => void;
  flushPendingSave: (targetDate?: string) => Promise<void>;
  hasPendingChanges: () => boolean;
  handleInsertPrompt: (text: string) => void;
  persistDraft: (dateISO: string, body: string) => Promise<void>;
  clearDraft: (dateISO: string) => void;
  getPreviewBody: (dateISO: string) => string;
  updateActiveBody: (body: string) => void;
};

export const useDiaryEntrySession = ({
  data,
  navigation,
  encryption,
  incrementCounter,
  logDebug,
  scheduleFlipRefresh,
  scheduleDebugStuckCheck,
  debugLastUserInputRef,
  isCurrentPageEditable,
}: UseDiaryEntrySessionParams): UseDiaryEntrySessionResult => {
  const [currentBodyState, setCurrentBodyState] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  const currentBodyRef = useRef('');
  const isDirtyRef = useRef(false);
  const suppressEditorOnChangeRef = useRef(false);
  const externalChangeOriginRef = useRef<'remote' | 'draft' | 'reset' | null>(null);
  const pendingSaveTimeoutRef = useRef<number | null>(null);
  const pendingSaveValueRef = useRef<{ dateISO: string; body: string } | null>(null);
  const lastLocalEditRef = useRef(0);
  const lastRemoteUpdateRef = useRef(0);
  const loadRequestIdRef = useRef(0);
  const lastQueuedBodyRef = useRef<{ dateISO: string; body: string } | null>(null);
  const previousDateRef = useRef<string | null>(null);
  const volatileDraftsRef = useRef<Map<string, DraftSnapshot>>(new Map());
  const editorVersionRef = useRef<Map<string, number>>(new Map());
  const sessionBodiesRef = useRef<Map<string, string>>(new Map());
  const persistedBodiesRef = useRef<Map<string, string>>(new Map());
  const loadEntryRef = useRef(data.loadEntry);

  useEffect(() => {
    loadEntryRef.current = data.loadEntry;
  }, [data.loadEntry]);

  const setBodyForDate = useCallback((dateISO: string, body: string) => {
    sessionBodiesRef.current.set(dateISO, body);
  }, []);

  const getOrInitEditorVersion = useCallback((dateISO: string) => {
    if (!editorVersionRef.current.has(dateISO)) {
      editorVersionRef.current.set(dateISO, 0);
    }
    return editorVersionRef.current.get(dateISO) ?? 0;
  }, []);

  const bumpEditorVersion = useCallback((dateISO: string, reason: string) => {
    const previous = editorVersionRef.current.get(dateISO) ?? 0;
    const nextVersion = previous + 1;
    editorVersionRef.current.set(dateISO, nextVersion);
    logDebug('editor.version.bump', { dateISO, previous, next: nextVersion, reason });
    return nextVersion;
  }, [logDebug]);

  const clearDraft = useCallback((dateISO: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(getDraftStorageKey(dateISO));
    volatileDraftsRef.current.delete(dateISO);
    logDebug('draft.clear', { dateISO });
  }, [logDebug]);

  const persistDraft = useCallback(async (dateISO: string, body: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (encryption.status !== 'ready') {
      volatileDraftsRef.current.set(dateISO, {
        body,
        updatedAt: Date.now(),
      });
      setBodyForDate(dateISO, body);
      incrementCounter('draftsSaved');
      logDebug('draft.persist', {
        dateISO,
        mode: 'volatile',
        bodyLength: body.length,
      });
      return;
    }
    try {
      const { cryptoKey } = encryption.getMasterKey();
      const { ciphertext, nonce } = await encryptPayload({
        key: cryptoKey,
        cryptoAdapter,
        payload: { body },
      });
      const record: DraftStoragePayload = {
        version: DRAFT_STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        encrypted: true,
        ciphertext: encodeBytesToBase64(ciphertext),
        nonce: encodeBytesToBase64(nonce),
      };
      window.localStorage.setItem(getDraftStorageKey(dateISO), JSON.stringify(record));
      setBodyForDate(dateISO, body);
      incrementCounter('draftsSaved');
      logDebug('draft.persist', {
        dateISO,
        mode: 'encrypted-storage',
        bodyLength: body.length,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to persist diary draft', error);
      }
    }
  }, [encryption, incrementCounter, logDebug, setBodyForDate]);

  const loadDraft = useCallback(async (dateISO: string): Promise<DraftSnapshot | null> => {
    if (typeof window === 'undefined') {
      return null;
    }
    if (encryption.status !== 'ready') {
      const snap = volatileDraftsRef.current.get(dateISO) ?? null;
      if (snap) {
        incrementCounter('draftsLoaded');
        logDebug('draft.load', {
          dateISO,
          source: 'volatile',
          bodyLength: snap.body.length,
          updatedAt: snap.updatedAt,
        });
      }
      return snap;
    }
    const raw = window.localStorage.getItem(getDraftStorageKey(dateISO));
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as DraftStoragePayload;
      if (parsed.version !== DRAFT_STORAGE_VERSION || typeof parsed.updatedAt !== 'string') {
        return null;
      }
      const updatedAt = Number.isFinite(Date.parse(parsed.updatedAt))
        ? Date.parse(parsed.updatedAt)
        : Date.now();
      if (parsed.encrypted) {
        if (!parsed.ciphertext || !parsed.nonce) {
          return null;
        }
        if (encryption.status !== 'ready') {
          return null;
        }
        const { cryptoKey } = encryption.getMasterKey();
        const payload = await decryptPayload<{ body: string }>({
          key: cryptoKey,
          cryptoAdapter,
          ciphertext: decodeBase64ToBytes(parsed.ciphertext),
          nonce: decodeBase64ToBytes(parsed.nonce),
        });
        const body = payload.body ?? '';
        incrementCounter('draftsLoaded');
        logDebug('draft.load', {
          dateISO,
          source: 'encrypted-storage',
          bodyLength: body.length,
          updatedAt,
        });
        return {
          body,
          updatedAt,
        };
      }
      if (typeof parsed.body !== 'string') {
        return null;
      }
      return {
        body: parsed.body,
        updatedAt,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to load diary draft', error);
      }
      window.localStorage.removeItem(getDraftStorageKey(dateISO));
      return null;
    }
  }, [encryption, incrementCounter, logDebug]);

  const updateActiveBody = useCallback((body: string) => {
    if (!navigation.currentDate) {
      return;
    }
    currentBodyRef.current = body;
    setBodyForDate(navigation.currentDate, body);
    setCurrentBodyState(body);
  }, [navigation.currentDate, setBodyForDate]);

  const handleSaveEntry = useCallback(async (bodyOverride?: string, dateOverride?: string) => {
    const targetDateISO = dateOverride ?? navigation.currentDate;
    if (!targetDateISO) {
      return null;
    }
    const bodyToPersist = bodyOverride ?? (targetDateISO === navigation.currentDate
      ? currentBodyRef.current
      : bodyOverride ?? '');
    const nowISO = new Date().toISOString();

    logDebug('entry.save.start', {
      targetDateISO,
      bodyLength: bodyToPersist.length,
    });

    let saved: SaveEntryResult | null = null;
    try {
      saved = await data.saveEntry({
        dateISO: targetDateISO,
        content: {
          body: bodyToPersist,
          createdAtISO: nowISO,
          updatedAtISO: nowISO,
        },
        tzAtEntry: data.profile?.timezone ?? null,
      });
    } catch (error) {
      logDebug('entry.save.error', {
        targetDateISO,
        message: error instanceof Error ? error.message : String(error),
      }, true);
      throw error;
    }

    setBodyForDate(targetDateISO, bodyToPersist);

    if (targetDateISO === navigation.currentDate) {
      setCurrentEntryId(saved.record.id);
      const savedTimestamp = Date.parse(saved.content.updatedAtISO ?? '') || Date.now();
      lastLocalEditRef.current = savedTimestamp;
      lastRemoteUpdateRef.current = savedTimestamp;
      if (currentBodyRef.current === bodyToPersist) {
        isDirtyRef.current = false;
      }
      suppressEditorOnChangeRef.current = true;
    }

    if (
      pendingSaveValueRef.current
      && pendingSaveValueRef.current.dateISO === targetDateISO
      && pendingSaveValueRef.current.body === bodyToPersist
    ) {
      pendingSaveValueRef.current = null;
    }
    clearDraft(targetDateISO);
    incrementCounter('savesFlushed');
    logDebug('entry.save.success', {
      targetDateISO,
      bodyLength: bodyToPersist.length,
    });
    persistedBodiesRef.current.set(targetDateISO, bodyToPersist);
    lastQueuedBodyRef.current = null;
    return saved;
  }, [clearDraft, data, incrementCounter, logDebug, navigation.currentDate, setBodyForDate]);

  const enqueueSave = useCallback((dateISO: string, body: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    const persisted = persistedBodiesRef.current.get(dateISO) ?? '';
    if (body === persisted) {
      if (pendingSaveTimeoutRef.current !== null) {
        window.clearTimeout(pendingSaveTimeoutRef.current);
        pendingSaveTimeoutRef.current = null;
      }
      if (pendingSaveValueRef.current?.dateISO === dateISO) {
        pendingSaveValueRef.current = null;
      }
      lastQueuedBodyRef.current = null;
      isDirtyRef.current = false;
      logDebug('entry.save.skip', {
        dateISO,
        bodyLength: body.length,
        reason: 'no-change',
      });
      return;
    }
    if (
      lastQueuedBodyRef.current
      && lastQueuedBodyRef.current.dateISO === dateISO
      && lastQueuedBodyRef.current.body === body
    ) {
      logDebug('entry.save.skip', {
        dateISO,
        bodyLength: body.length,
        reason: 'already-queued',
      });
      return;
    }
    pendingSaveValueRef.current = { dateISO, body };
    if (pendingSaveTimeoutRef.current !== null) {
      window.clearTimeout(pendingSaveTimeoutRef.current);
    }
    incrementCounter('savesQueued');
    logDebug('entry.save.enqueue', {
      dateISO,
      bodyLength: body.length,
    });
    lastQueuedBodyRef.current = { dateISO, body };
    pendingSaveTimeoutRef.current = window.setTimeout(() => {
      pendingSaveTimeoutRef.current = null;
      const pending = pendingSaveValueRef.current;
      if (!pending || pending.dateISO !== dateISO) {
        return;
      }
      pendingSaveValueRef.current = null;
      void handleSaveEntry(pending.body, pending.dateISO).catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to auto-save diary entry', error);
        }
        logDebug('entry.save.enqueue.error', {
          dateISO: pending.dateISO,
          message: error instanceof Error ? error.message : String(error),
        });
        pendingSaveValueRef.current = pending;
        isDirtyRef.current = true;
      });
      lastQueuedBodyRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  }, [handleSaveEntry, incrementCounter, logDebug]);

  const flushPendingSave = useCallback(async (targetDate?: string) => {
    if (typeof window !== 'undefined' && pendingSaveTimeoutRef.current !== null) {
      window.clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    const pending = pendingSaveValueRef.current;
    if (pending && (!targetDate || pending.dateISO === targetDate)) {
      pendingSaveValueRef.current = null;
      try {
        await handleSaveEntry(pending.body, pending.dateISO);
        incrementCounter('savesFlushed');
        logDebug('entry.save.flush.success', {
          dateISO: pending.dateISO,
          bodyLength: pending.body.length,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to flush diary entry', error);
        }
        pendingSaveValueRef.current = pending;
        isDirtyRef.current = true;
        logDebug('entry.save.flush.error', {
          dateISO: pending.dateISO,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }
    if (targetDate && targetDate !== navigation.currentDate) {
      return;
    }
    if (!navigation.currentDate || !isDirtyRef.current) {
      return;
    }
    try {
      await handleSaveEntry(currentBodyRef.current, navigation.currentDate);
      incrementCounter('savesFlushed');
      logDebug('entry.save.flush.success', {
        dateISO: navigation.currentDate,
        bodyLength: currentBodyRef.current.length,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to flush diary entry', error);
      }
      isDirtyRef.current = true;
      logDebug('entry.save.flush.error', {
        dateISO: navigation.currentDate,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [handleSaveEntry, incrementCounter, logDebug, navigation.currentDate]);

  const hasPendingChanges = useCallback(() => {
    if (pendingSaveTimeoutRef.current !== null) {
      return true;
    }
    if (pendingSaveValueRef.current) {
      return true;
    }
    return isDirtyRef.current;
  }, []);

  const handleInsertPrompt = useCallback((text: string) => {
    if (!navigation.currentDate || !isCurrentPageEditable()) {
      return;
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return;
    }
    const next = `${currentBodyRef.current}\n\n${trimmed}`.trim();
    currentBodyRef.current = next;
    setBodyForDate(navigation.currentDate, next);
    setCurrentBodyState(next);
    lastLocalEditRef.current = Date.now();
    isDirtyRef.current = true;
    scheduleFlipRefresh();
    void persistDraft(navigation.currentDate, next);
    enqueueSave(navigation.currentDate, next);
    externalChangeOriginRef.current = null;
    debugLastUserInputRef.current = Date.now();
    incrementCounter('editorUser');
    logDebug('editor.insertPrompt', {
      bodyLength: next.length,
      dateISO: navigation.currentDate,
    });
    scheduleDebugStuckCheck();
  }, [
    debugLastUserInputRef,
    enqueueSave,
    incrementCounter,
    isCurrentPageEditable,
    logDebug,
    navigation.currentDate,
    persistDraft,
    scheduleDebugStuckCheck,
    scheduleFlipRefresh,
    setBodyForDate,
  ]);

  const getPreviewBody = useCallback((dateISO: string) => {
    if (navigation.currentDate === dateISO) {
      return currentBodyRef.current;
    }
    if (sessionBodiesRef.current.has(dateISO)) {
      return sessionBodiesRef.current.get(dateISO) ?? '';
    }
    const volatileDraft = volatileDraftsRef.current.get(dateISO);
    if (volatileDraft) {
      return volatileDraft.body;
    }
    const entry = data.entries.get(dateISO);
    if (entry) {
      return entry.content.body ?? '';
    }
    return '';
  }, [data.entries, navigation.currentDate]);

  useEffect(() => {
    const targetDate = navigation.currentDate;

    if (!targetDate) {
      isDirtyRef.current = false;
      lastLocalEditRef.current = 0;
      lastRemoteUpdateRef.current = 0;
      suppressEditorOnChangeRef.current = true;
      externalChangeOriginRef.current = 'reset';
      currentBodyRef.current = '';
      setCurrentBodyState('');
      setCurrentEntryId(null);
      return;
    }

    getOrInitEditorVersion(targetDate);

    const loadId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = loadId;
    const loadStartedAt = Date.now();

    isDirtyRef.current = false;
    lastLocalEditRef.current = 0;
    lastRemoteUpdateRef.current = 0;
    suppressEditorOnChangeRef.current = true;
    externalChangeOriginRef.current = 'reset';
    currentBodyRef.current = '';
    setBodyForDate(targetDate, '');
    setCurrentBodyState('');
    setCurrentEntryId(null);

    let cancelled = false;

    const load = async () => {
      logDebug('entry.load.start', { targetDate });
      let draft: DraftSnapshot | null = null;

      try {
        draft = await loadDraft(targetDate);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to load diary draft', error);
        }
      }

      if (
        cancelled
        || navigation.currentDate !== targetDate
        || loadRequestIdRef.current !== loadId
      ) {
        return;
      }

      if (draft) {
        currentBodyRef.current = draft.body;
        setBodyForDate(targetDate, draft.body);
        setCurrentBodyState(draft.body);
        externalChangeOriginRef.current = 'draft';
        isDirtyRef.current = true;
        lastLocalEditRef.current = draft.updatedAt;
        suppressEditorOnChangeRef.current = true;
        bumpEditorVersion(targetDate, 'draft-load');
      }

      let entry: Awaited<ReturnType<DiaryDataValue['loadEntry']>> | null = null;

      try {
        entry = await loadEntryRef.current(targetDate);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to load diary entry', error);
        }
      }

      if (
        cancelled
        || navigation.currentDate !== targetDate
        || loadRequestIdRef.current !== loadId
      ) {
        return;
      }

      if (!entry) {
        lastRemoteUpdateRef.current = 0;
        setCurrentEntryId(null);
        if (!draft) {
          suppressEditorOnChangeRef.current = true;
          externalChangeOriginRef.current = 'reset';
          currentBodyRef.current = '';
          setBodyForDate(targetDate, '');
          setCurrentBodyState('');
          bumpEditorVersion(targetDate, 'empty-entry');
        }
        persistedBodiesRef.current.set(targetDate, '');
        logDebug('entry.load.empty', { targetDate });
        scheduleFlipRefresh();
        return;
      }

      setCurrentEntryId(entry.record.id);

      const remoteTimestampRaw = Date.parse(entry.content.updatedAtISO ?? '');
      const remoteTimestamp = Number.isNaN(remoteTimestampRaw)
        ? loadStartedAt
        : remoteTimestampRaw;
      const previousLocalEdit = lastLocalEditRef.current;
      lastRemoteUpdateRef.current = remoteTimestamp;

      if (draft && draft.updatedAt > remoteTimestamp) {
        isDirtyRef.current = true;
        suppressEditorOnChangeRef.current = true;
        externalChangeOriginRef.current = 'draft';
        scheduleFlipRefresh();
        return;
      }

      const nextBody = entry.content.body ?? '';
      if (
        navigation.currentDate === targetDate
        && previousLocalEdit
        && previousLocalEdit > remoteTimestamp
        && nextBody !== currentBodyRef.current
      ) {
        logDebug('entry.load.stale', {
          targetDate,
          remoteTimestamp,
          previousLocalEdit,
          incomingLength: nextBody.length,
          currentLength: currentBodyRef.current.length,
        });
        return;
      }

      if (
        navigation.currentDate === targetDate
        && nextBody.length < currentBodyRef.current.length
      ) {
        logDebug('entry.load.ignored.shorter', {
          targetDate,
          remoteTimestamp,
          incomingLength: nextBody.length,
          currentLength: currentBodyRef.current.length,
        });
        return;
      }

      isDirtyRef.current = false;
      lastLocalEditRef.current = remoteTimestamp;
      suppressEditorOnChangeRef.current = true;
      if (nextBody !== currentBodyRef.current) {
        currentBodyRef.current = nextBody;
        setBodyForDate(targetDate, nextBody);
        setCurrentBodyState(nextBody);
      }
      persistedBodiesRef.current.set(targetDate, nextBody);
      externalChangeOriginRef.current = 'remote';
      clearDraft(targetDate);
      logDebug('entry.load.success', {
        targetDate,
        remoteTimestamp,
        bodyLength: nextBody.length,
      });
      bumpEditorVersion(targetDate, 'remote-load');
      scheduleFlipRefresh();
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    bumpEditorVersion,
    clearDraft,
    getOrInitEditorVersion,
    loadDraft,
    logDebug,
    navigation.currentDate,
    scheduleFlipRefresh,
    setBodyForDate,
  ]);

  useEffect(() => {
    const previousDate = previousDateRef.current;
    if (previousDate && previousDate !== navigation.currentDate) {
      void flushPendingSave(previousDate);
    }
    previousDateRef.current = navigation.currentDate;
    lastQueuedBodyRef.current = null;
  }, [flushPendingSave, navigation.currentDate]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingChanges()) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
      void flushPendingSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushPendingSave, hasPendingChanges]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingSave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingSave]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && pendingSaveTimeoutRef.current !== null) {
        window.clearTimeout(pendingSaveTimeoutRef.current);
      }
      void flushPendingSave();
    };
  }, [flushPendingSave]);

  const result = useMemo<UseDiaryEntrySessionResult>(() => ({
    currentBody: currentBodyState,
    currentEntryId,
    setCurrentEntryId,
    currentBodyRef,
    isDirtyRef,
    suppressEditorOnChangeRef,
    externalChangeOriginRef,
    pendingSaveValueRef,
    lastLocalEditRef,
    lastRemoteUpdateRef,
    volatileDraftsRef,
    getOrInitEditorVersion,
    bumpEditorVersion,
    handleSaveEntry,
    enqueueSave,
    flushPendingSave,
    hasPendingChanges,
    handleInsertPrompt,
    persistDraft,
    clearDraft,
    getPreviewBody,
    updateActiveBody,
  }), [
    bumpEditorVersion,
    clearDraft,
    currentBodyState,
    currentEntryId,
    enqueueSave,
    flushPendingSave,
    getOrInitEditorVersion,
    getPreviewBody,
    handleInsertPrompt,
    handleSaveEntry,
    hasPendingChanges,
    persistDraft,
    updateActiveBody,
  ]);

  return result;
};
