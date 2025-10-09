'use client';

/* eslint-disable react/no-unstable-context-value */
/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  CryptoAdapter,
  DiaryCoachPromptFilter,
  DiaryEntryMeta,
  DiaryEntryRecord,
  DiaryEntryWrite,
  DiaryGoalRecord,
  DiaryGoalWrite,
  ProfessionalSummary,
} from '@/features/diary/adapters/types';
import {
  diaryDeleteGoal,
  diaryGetEntryByDate,
  diaryGetProfessionalPublicKey,
  diaryLinkGoalToEntry,
  diaryListCoachPrompts,
  diaryListEntriesMeta,
  diaryListGoals,
  diaryListProfessionals,
  diaryRevokeShare,
  diaryShareEntry,
  diaryUnlinkGoalFromEntry,
  diaryUpsertEntry,
  diaryUpsertGoal,
} from '@/features/diary/server/actions';

import { decryptPayload, encryptPayload, importAesKey } from '../cryptoUtils';
import type {
  DiaryEntryContent,
  DiaryGoalContent,
} from '../serialization';
import {
  createEmptyGoalContent,
} from '../serialization';
import { useDiaryEncryption } from './DiaryEncryptionContext';

type DiaryProfile = {
  avatarAnimal: string | null;
  timezone?: string | null;
} | null;

type DiaryEntryState = {
  record: DiaryEntryRecord;
  content: DiaryEntryContent;
};

export type DiaryGoalState = {
  record: DiaryGoalRecord;
  content: DiaryGoalContent;
};

type DiaryDataContextValue = {
  profile: DiaryProfile;
  todayISO: string;
  diaryGraceMinutes: number | null;
  entries: Map<string, DiaryEntryState>;
  entryMeta: Map<string, DiaryEntryMeta>;
  goals: Map<string, DiaryGoalState>;
  professionals: ProfessionalSummary[];
  loadEntry: (dateISO: string) => Promise<DiaryEntryState | null>;
  saveEntry: (params: {
    dateISO: string;
    content: DiaryEntryContent;
    mood?: string | null;
    tzAtEntry?: string | null;
  }) => Promise<DiaryEntryState>;
  loadEntriesMeta: (range: { from: string; to: string }) => Promise<void>;
  loadGoals: () => Promise<void>;
  saveGoal: (payload: DiaryGoalContent & { id?: string }) => Promise<DiaryGoalState>;
  deleteGoal: (goalId: string) => Promise<void>;
  linkGoal: (link: { goalId: string; entryId: string; dateISO: string }) => Promise<void>;
  unlinkGoal: (link: { goalId: string; entryId: string; dateISO: string }) => Promise<void>;
  refreshProfessionals: () => Promise<ProfessionalSummary[]>;
  getProfessionalPublicKey: (professionalId: string) => Promise<Uint8Array>;
  shareEntry: (payload: { entryId: string; dateISO: string; professionalId: string }) => Promise<void>;
  revokeShare: (payload: { entryId: string; dateISO: string; professionalId: string }) => Promise<void>;
  listCoachPrompts: (
    filter: DiaryCoachPromptFilter,
  ) => Promise<Awaited<ReturnType<typeof diaryListCoachPrompts>>>;
  setProfile: (profile: DiaryProfile) => void;
};

const DiaryDataContext = createContext<DiaryDataContextValue | null>(null);

type DiaryDataProviderProps = {
  children: React.ReactNode;
  todayISO: string;
  diaryGraceMinutes: number | null;
  initialProfile: DiaryProfile;
  cryptoAdapter: CryptoAdapter;
  initialEntryRecord?: DiaryEntryRecord | null;
  initialGoals?: DiaryGoalRecord[];
  initialMeta?: DiaryEntryMeta[];
};

const mapFromArray = <T,>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(getKey(item), item);
  }
  return map;
};

const computeWordCount = (content: DiaryEntryContent) => {
  const words = content.body.trim().split(/\s+/u).filter(Boolean);
  return words.length;
};

export const DiaryDataProvider = ({
  children,
  todayISO,
  diaryGraceMinutes,
  initialProfile,
  cryptoAdapter,
  initialEntryRecord,
  initialGoals,
  initialMeta,
}: DiaryDataProviderProps) => {
  const encryption = useDiaryEncryption();

  const [profile, setProfile] = useState<DiaryProfile>(initialProfile);
  const [entries, setEntries] = useState<Map<string, DiaryEntryState>>(new Map());
  const [entryMeta, setEntryMeta] = useState<Map<string, DiaryEntryMeta>>(
    () => mapFromArray(initialMeta ?? [], item => item.dateISO),
  );
  const [goals, setGoals] = useState<Map<string, DiaryGoalState>>(new Map());
  const [professionals, setProfessionals] = useState<ProfessionalSummary[]>([]);
  const hydratedRef = useRef(false);

  const decryptEntry = useCallback(
    async (record: DiaryEntryRecord): Promise<DiaryEntryState> => {
      const { cryptoKey } = encryption.getMasterKey();
      const content = await decryptPayload<DiaryEntryContent>({
        key: cryptoKey,
        cryptoAdapter,
        ciphertext: record.ciphertext,
        nonce: record.nonce,
        aad: record.aad ?? undefined,
      });

      return {
        record,
        content,
      };
    },
    [cryptoAdapter, encryption],
  );

  useEffect(() => {
    if (encryption.status !== 'ready' || hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;

    const hydrate = async () => {
      if (initialEntryRecord) {
        const state = await decryptEntry(initialEntryRecord);
        setEntries((prev) => {
          const next = new Map(prev);
          next.set(initialEntryRecord.dateISO, state);
          return next;
        });
      }

      if (initialGoals && initialGoals.length > 0) {
        const { cryptoKey } = encryption.getMasterKey();
        const next = new Map<string, DiaryGoalState>();
        for (const record of initialGoals) {
          const content = await decryptPayload<DiaryGoalContent>({
            key: cryptoKey,
            cryptoAdapter,
            ciphertext: record.ciphertext,
            nonce: record.nonce,
            aad: record.aad ?? undefined,
          });
          next.set(record.id, { record, content });
        }
        setGoals(next);
      }
    };

    void hydrate().catch((error) => {
      console.error('Failed to hydrate diary data', error);
    });
  }, [cryptoAdapter, decryptEntry, encryption, initialEntryRecord, initialGoals]);

  return (
    <DiaryDataContext.Provider
      value={{
        profile,
        todayISO,
        diaryGraceMinutes,
        entries,
        entryMeta,
        goals,
        professionals,
        async loadEntry(dateISO) {
          if (entries.has(dateISO)) {
            return entries.get(dateISO) ?? null;
          }

          const record = await diaryGetEntryByDate(dateISO);
          if (!record) {
            return null;
          }

          const state = await decryptEntry(record);
          setEntries((prev) => {
            const next = new Map(prev);
            next.set(dateISO, state);
            return next;
          });

          setEntryMeta((prev) => {
            const next = new Map(prev);
            next.set(dateISO, {
              dateISO,
              wordCount: record.wordCount ?? undefined,
              mood: record.mood ?? undefined,
              tzAtEntry: record.tzAtEntry ?? undefined,
            });
            return next;
          });

          return state;
        },
        async saveEntry({ dateISO, content, mood, tzAtEntry }) {
          const { cryptoKey } = encryption.getMasterKey();
          const nowISO = new Date().toISOString();
          const resolvedContent: DiaryEntryContent = {
            ...content,
            createdAtISO: content.createdAtISO ?? nowISO,
            updatedAtISO: nowISO,
          };
          const payload: DiaryEntryWrite = await (async () => {
            const { ciphertext, nonce } = await encryptPayload({
              key: cryptoKey,
              cryptoAdapter,
              payload: resolvedContent,
            });

            return {
              ciphertext,
              nonce,
              aad: null,
              mood: mood ?? null,
              wordCount: computeWordCount(resolvedContent),
              tzAtEntry: tzAtEntry ?? null,
            } satisfies DiaryEntryWrite;
          })();

          const record = await diaryUpsertEntry(dateISO, payload);
          const state: DiaryEntryState = {
            record,
            content: resolvedContent,
          };

          setEntries((prev) => {
            const next = new Map(prev);
            next.set(dateISO, state);
            return next;
          });

          setEntryMeta((prev) => {
            const next = new Map(prev);
            next.set(dateISO, {
              dateISO,
              wordCount: payload.wordCount ?? undefined,
              mood: payload.mood ?? undefined,
              tzAtEntry: payload.tzAtEntry ?? undefined,
            });
            return next;
          });

          return state;
        },
        async loadEntriesMeta(range) {
          const items = await diaryListEntriesMeta(range);
          setEntryMeta((prev) => {
            const next = new Map(prev);
            for (const item of items) {
              next.set(item.dateISO, item);
            }
            return next;
          });
        },
        async loadGoals() {
          const records = await diaryListGoals();
          if (encryption.status !== 'ready') {
            setGoals(new Map());
            return;
          }

          const { cryptoKey } = encryption.getMasterKey();

          const next = new Map<string, DiaryGoalState>();
          for (const record of records) {
            const content = await decryptPayload<DiaryGoalContent>({
              key: cryptoKey,
              cryptoAdapter,
              ciphertext: record.ciphertext,
              nonce: record.nonce,
              aad: record.aad ?? undefined,
            });

            next.set(record.id, {
              record,
              content,
            });
          }

          setGoals(next);
        },
        async saveGoal({ id, ...goalContent }) {
          const { cryptoKey } = encryption.getMasterKey();
          const existing = id ? goals.get(id)?.content : null;
          const nowISO = new Date().toISOString();
          const content: DiaryGoalContent = {
            ...(existing ?? createEmptyGoalContent()),
            ...goalContent,
            createdAtISO: existing?.createdAtISO ?? goalContent.createdAtISO ?? nowISO,
            updatedAtISO: nowISO,
          };

          const { ciphertext, nonce } = await encryptPayload({
            key: cryptoKey,
            cryptoAdapter,
            payload: content,
          });

          const payload: DiaryGoalWrite = {
            id,
            ciphertext,
            nonce,
            aad: null,
          } satisfies DiaryGoalWrite;

          const record = await diaryUpsertGoal(payload);

          const state: DiaryGoalState = {
            record,
            content,
          };

          setGoals((prev) => {
            const next = new Map(prev);
            next.set(record.id, state);
            return next;
          });

          return state;
        },
        async deleteGoal(goalId) {
          await diaryDeleteGoal(goalId);
          setGoals((prev) => {
            const next = new Map(prev);
            next.delete(goalId);
            return next;
          });
        },
        async linkGoal({ goalId, entryId, dateISO }) {
          await diaryLinkGoalToEntry({ goalId, entryId });

          setEntryMeta((prev) => {
            const next = new Map(prev);
            const meta = next.get(dateISO);
            if (!meta) {
              next.set(dateISO, {
                dateISO,
                goalIds: [goalId],
              });
              return next;
            }

            const goals = new Set(meta.goalIds ?? []);
            goals.add(goalId);
            next.set(dateISO, {
              ...meta,
              goalIds: Array.from(goals),
            });
            return next;
          });
        },
        async unlinkGoal({ goalId, entryId, dateISO }) {
          await diaryUnlinkGoalFromEntry({ goalId, entryId });

          setEntryMeta((prev) => {
            const next = new Map(prev);
            const meta = next.get(dateISO);
            if (!meta) {
              return next;
            }

            next.set(dateISO, {
              ...meta,
              goalIds: (meta.goalIds ?? []).filter(id => id !== goalId),
            });
            return next;
          });
        },
        async refreshProfessionals() {
          const list = await diaryListProfessionals();
          setProfessionals(list);
          return list;
        },
        getProfessionalPublicKey(professionalId) {
          return diaryGetProfessionalPublicKey(professionalId);
        },
        async shareEntry({ entryId, dateISO, professionalId }) {
          const { raw } = encryption.getMasterKey();
          const proKeyBytes = await diaryGetProfessionalPublicKey(professionalId);
          const proKey = await importAesKey(proKeyBytes);
          const { ct, nonce } = await cryptoAdapter.encrypt(raw, proKey);
          const envelope = new Uint8Array(nonce.length + ct.length);
          envelope.set(nonce, 0);
          envelope.set(ct, nonce.length);

          await diaryShareEntry({ entryId, professionalId, envelope });

          setEntryMeta((prev) => {
            const next = new Map(prev);
            const meta = next.get(dateISO);
            if (!meta) {
              next.set(dateISO, {
                dateISO,
                sharedProfessionalIds: [professionalId],
              });
              return next;
            }
            const shared = new Set(meta.sharedProfessionalIds ?? []);
            shared.add(professionalId);
            next.set(dateISO, {
              ...meta,
              sharedProfessionalIds: Array.from(shared),
            });
            return next;
          });

          setEntries((prev) => {
            const next = new Map(prev);
            const entry = next.get(dateISO);
            if (!entry) {
              return next;
            }
            const sharedList = entry.record.sharedWith ?? [];
            const updated = {
              record: {
                ...entry.record,
                sharedWith: [
                  ...sharedList,
                  {
                    professionalId,
                    sharedAt: new Date().toISOString(),
                  },
                ],
              },
              content: entry.content,
            };
            next.set(dateISO, updated);
            return next;
          });
        },
        async revokeShare({ entryId, dateISO, professionalId }) {
          await diaryRevokeShare({ entryId, professionalId });

          setEntryMeta((prev) => {
            const next = new Map(prev);
            const meta = next.get(dateISO);
            if (!meta) {
              return next;
            }
            const shared = (meta.sharedProfessionalIds ?? []).filter(id => id !== professionalId);
            next.set(dateISO, {
              ...meta,
              sharedProfessionalIds: shared,
            });
            return next;
          });

          setEntries((prev) => {
            const next = new Map(prev);
            const entry = next.get(dateISO);
            if (!entry) {
              return next;
            }
            const updated = {
              record: {
                ...entry.record,
                sharedWith: (entry.record.sharedWith ?? []).filter(
                  share => share.professionalId !== professionalId,
                ),
              },
              content: entry.content,
            };
            next.set(dateISO, updated);
            return next;
          });
        },
        listCoachPrompts(filter) {
          return diaryListCoachPrompts(filter);
        },
        setProfile(nextProfile) {
          setProfile(nextProfile);
        },
      }}
    >
      {children}
    </DiaryDataContext.Provider>
  );
};

export const useDiaryData = () => {
  const context = useContext(DiaryDataContext);
  if (!context) {
    throw new Error('useDiaryData must be used within DiaryDataProvider');
  }
  return context;
};
