'use server';

import type {
  DiaryCoachPromptFilter,
  DiaryCoachPromptInput,
  DiaryCoachPromptPatch,
  DiaryEntryMetaRange,
  DiaryEntryWrite,
  DiaryGoalLink,
  DiaryGoalWrite,
  DiaryKdfParams,
  DiaryShareEnvelope,
} from '@/features/diary/adapters/types';

import { getDiaryServerState } from './runtime';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const assertDate = (value: string) => {
  if (!DATE_REGEX.test(value)) {
    throw new Error('INVALID_DATE');
  }
};

const requireUserId = async () => {
  const { adapters } = getDiaryServerState();
  const { id } = await adapters.auth.requireAuth();
  return id;
};

export const diaryGetCurrentUser = async () => {
  const id = await requireUserId();
  return { id };
};

const requireAdmin = async () => {
  const { adapters } = getDiaryServerState();
  const session = await adapters.auth.getCurrentSession();

  if (!session || session.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  return session.id;
};

export const diaryGetKeyring = async () => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  return adapters.keyringStore.getEncMasterKey(userId);
};

type PutKeyringPayload = {
  encMasterKey: Uint8Array;
  salt: Uint8Array;
  kdfParams: DiaryKdfParams;
};

export const diaryPutKeyring = async (payload: PutKeyringPayload) => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  await adapters.keyringStore.putEncMasterKey(userId, payload);
};

export const diaryGetEntryByDate = async (dateISO: string) => {
  const { adapters } = getDiaryServerState();
  assertDate(dateISO);
  const userId = await requireUserId();
  return adapters.diaryStore.getEntryByDate(userId, dateISO);
};

export const diaryUpsertEntry = async (
  dateISO: string,
  payload: DiaryEntryWrite,
) => {
  const { adapters } = getDiaryServerState();
  assertDate(dateISO);
  const userId = await requireUserId();
  return adapters.diaryStore.upsertEntry(userId, dateISO, payload);
};

export const diaryListEntriesMeta = async (range: DiaryEntryMetaRange) => {
  const { adapters } = getDiaryServerState();
  assertDate(range.from);
  assertDate(range.to);
  const userId = await requireUserId();
  return adapters.diaryStore.listEntriesMeta(userId, range);
};

export const diaryListGoals = async () => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  return adapters.diaryStore.listGoals(userId);
};

export const diaryUpsertGoal = async (payload: DiaryGoalWrite) => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  return adapters.diaryStore.upsertGoal(userId, payload);
};

export const diaryDeleteGoal = async (goalId: string) => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  await adapters.diaryStore.deleteGoal(userId, goalId);
};

export const diaryLinkGoalToEntry = async (link: DiaryGoalLink) => {
  const { adapters } = getDiaryServerState();
  await requireUserId();
  await adapters.diaryStore.linkGoalToEntry(link);
};

export const diaryUnlinkGoalFromEntry = async (link: DiaryGoalLink) => {
  const { adapters } = getDiaryServerState();
  await requireUserId();
  await adapters.diaryStore.unlinkGoalFromEntry(link);
};

export const diaryListProfessionals = async () => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  return adapters.proDirectory.listMyProfessionals(userId);
};

export const diaryGetProfessionalPublicKey = async (professionalId: string) => {
  const { adapters } = getDiaryServerState();
  await requireUserId();
  return adapters.proDirectory.getProfessionalPublicKey(professionalId);
};

type ShareEntryPayload = {
  entryId: string;
  professionalId: string;
  envelope: DiaryShareEnvelope;
};

export const diaryShareEntry = async (payload: ShareEntryPayload) => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  return adapters.diaryStore.shareEntry(
    userId,
    payload.entryId,
    payload.professionalId,
    payload.envelope,
  );
};

type RevokeSharePayload = {
  entryId: string;
  professionalId: string;
};

export const diaryRevokeShare = async (payload: RevokeSharePayload) => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  await adapters.diaryStore.revokeShare(
    userId,
    payload.entryId,
    payload.professionalId,
  );
};

export const diaryListCoachPrompts = async (filter: DiaryCoachPromptFilter) => {
  const { adapters } = getDiaryServerState();
  await requireUserId();
  return adapters.diaryStore.listCoachPrompts(filter);
};

export const diaryCreateCoachPrompt = async (input: DiaryCoachPromptInput) => {
  const { adapters } = getDiaryServerState();
  await requireAdmin();
  return adapters.diaryStore.createCoachPrompt(input);
};

export const diaryUpdateCoachPrompt = async (
  id: string,
  patch: DiaryCoachPromptPatch,
) => {
  const { adapters } = getDiaryServerState();
  await requireAdmin();
  return adapters.diaryStore.updateCoachPrompt(id, patch);
};

export const diaryDeleteCoachPrompt = async (id: string) => {
  const { adapters } = getDiaryServerState();
  await requireAdmin();
  await adapters.diaryStore.deleteCoachPrompt(id);
};

export const diaryGetUserProfile = async () => {
  const { adapters } = getDiaryServerState();
  const userId = await requireUserId();
  return adapters.profile.getUserProfile(userId);
};
