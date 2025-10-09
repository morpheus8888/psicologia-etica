import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
} from 'drizzle-orm';

import type {
  DiaryCoachPromptFilter,
  DiaryCoachPromptInput,
  DiaryCoachPromptPatch,
  DiaryEntryMeta,
  DiaryEntryMetaRange,
  DiaryEntryRecord,
  DiaryEntryShareMeta,
  DiaryEntryWrite,
  DiaryGoalLink,
  DiaryGoalRecord,
  DiaryGoalWrite,
  DiaryShareEnvelope,
  DiaryStoreAdapter,
} from '@/features/diary/adapters/types';
import { db } from '@/libs/db';
import {
  diaryCoachPrompts,
  diaryEntries,
  diaryGoalEntries,
  diaryGoals,
  diaryShareAudits,
  diaryShares,
} from '@/models/diary';
import { userProfessionalLinks } from '@/models/professional';

type DiaryCoachPromptMutableFields = typeof diaryCoachPrompts.$inferInsert;

const mapEntryRow = (row: any): DiaryEntryRecord => {
  return {
    id: row.id,
    dateISO: row.entryDate,
    ciphertext: row.ciphertext,
    nonce: row.nonce,
    aad: row.aad ?? undefined,
    wordCount: row.wordCount ?? undefined,
    mood: row.mood ?? undefined,
    tzAtEntry: row.tzAtEntry ?? undefined,
    sharedWith: row.sharedWith ?? undefined,
  };
};

const mapGoalRow = (row: any): DiaryGoalRecord => ({
  id: row.id,
  ciphertext: row.ciphertext,
  nonce: row.nonce,
  aad: row.aad ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  deadlineISO: row.deadlineDate ?? null,
});

const mapPromptRow = (row: any) => ({
  id: row.id,
  locale: row.locale,
  scope: row.scope,
  text: row.text,
  tags: row.tags,
  weight: row.weight,
  enabled: row.enabled,
  startAt: row.startAt?.toISOString() ?? null,
  endAt: row.endAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const getEntryOwner = async (entryId: string) => {
  const [entryOwner] = await db
    .select({ userId: diaryEntries.userId })
    .from(diaryEntries)
    .where(eq(diaryEntries.id, entryId))
    .limit(1);

  if (!entryOwner) {
    throw new Error('ENTRY_NOT_FOUND');
  }

  return entryOwner.userId;
};

const getGoalOwner = async (goalId: string) => {
  const [goalOwner] = await db
    .select({ userId: diaryGoals.userId })
    .from(diaryGoals)
    .where(eq(diaryGoals.id, goalId))
    .limit(1);

  if (!goalOwner) {
    throw new Error('GOAL_NOT_FOUND');
  }

  return goalOwner.userId;
};

const ensureProfessionalLink = async (userId: string, professionalId: string) => {
  const [link] = await db
    .select({ id: userProfessionalLinks.id, status: userProfessionalLinks.status })
    .from(userProfessionalLinks)
    .where(
      and(
        eq(userProfessionalLinks.userId, userId),
        eq(userProfessionalLinks.professionalUserId, professionalId),
      ),
    )
    .limit(1);

  if (!link || link.status !== 'active') {
    throw new Error('PROFESSIONAL_NOT_LINKED');
  }
};

const listSharesForEntries = async (entryIds: string[], ownerUserId: string) => {
  if (entryIds.length === 0) {
    return new Map<string, DiaryEntryShareMeta[]>();
  }

  const rows = await db
    .select({
      entryId: diaryShares.entryId,
      professionalId: diaryShares.professionalUserId,
      sharedAt: diaryShares.updatedAt,
    })
    .from(diaryShares)
    .where(
      and(
        eq(diaryShares.ownerUserId, ownerUserId),
        inArray(diaryShares.entryId, entryIds),
      ),
    )
    .orderBy(diaryShares.updatedAt);

  const shareMap = new Map<string, DiaryEntryShareMeta[]>();

  for (const row of rows) {
    const list = shareMap.get(row.entryId) ?? [];
    list.push({
      professionalId: row.professionalId,
      sharedAt: row.sharedAt.toISOString(),
    });
    shareMap.set(row.entryId, list);
  }

  return shareMap;
};

const listGoalLinksForEntries = async (entryIds: string[]) => {
  if (entryIds.length === 0) {
    return new Map<string, string[]>();
  }

  const rows = await db
    .select({
      entryId: diaryGoalEntries.entryId,
      goalId: diaryGoalEntries.goalId,
    })
    .from(diaryGoalEntries)
    .where(inArray(diaryGoalEntries.entryId, entryIds));

  const map = new Map<string, string[]>();

  for (const row of rows) {
    const list = map.get(row.entryId) ?? [];
    list.push(row.goalId);
    map.set(row.entryId, list);
  }

  return map;
};

const buildPromptConditions = (filter: DiaryCoachPromptFilter) => {
  const conditions: any[] = [];

  if (filter.locale) {
    conditions.push(eq(diaryCoachPrompts.locale, filter.locale));
  }

  if (filter.scope) {
    conditions.push(eq(diaryCoachPrompts.scope, filter.scope));
  }

  if (!filter.includeDisabled) {
    conditions.push(eq(diaryCoachPrompts.enabled, true));
  }

  const activeAt = filter.activeAt ?? new Date();

  conditions.push(
    and(
      or(isNull(diaryCoachPrompts.startAt), lte(diaryCoachPrompts.startAt, activeAt)),
      or(isNull(diaryCoachPrompts.endAt), gte(diaryCoachPrompts.endAt, activeAt)),
    ),
  );

  return conditions;
};

export const diaryStoreAdapter: DiaryStoreAdapter = {
  async getEntryByDate(userId: string, dateISO: string) {
    const [row] = await db
      .select({
        id: diaryEntries.id,
        entryDate: diaryEntries.entryDate,
        ciphertext: diaryEntries.ciphertext,
        nonce: diaryEntries.nonce,
        aad: diaryEntries.aad,
        wordCount: diaryEntries.wordCount,
        mood: diaryEntries.mood,
        tzAtEntry: diaryEntries.tzAtEntry,
      })
      .from(diaryEntries)
      .where(
        and(eq(diaryEntries.userId, userId), eq(diaryEntries.entryDate, dateISO)),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    if (!row) {
      throw new Error('ENTRY_NOT_FOUND');
    }

    const sharedWith = await this.listSharedProfessionals(row.id, userId);

    return mapEntryRow({ ...row, sharedWith });
  },

  async upsertEntry(userId: string, dateISO: string, payload: DiaryEntryWrite) {
    const now = new Date();

    const [row] = await db
      .insert(diaryEntries)
      .values({
        userId,
        entryDate: dateISO,
        ciphertext: payload.ciphertext,
        nonce: payload.nonce,
        aad: payload.aad ?? null,
        wordCount: payload.wordCount ?? null,
        mood: payload.mood ?? null,
        tzAtEntry: payload.tzAtEntry ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [diaryEntries.userId, diaryEntries.entryDate],
        set: {
          ciphertext: payload.ciphertext,
          nonce: payload.nonce,
          aad: payload.aad ?? null,
          wordCount: payload.wordCount ?? null,
          mood: payload.mood ?? null,
          tzAtEntry: payload.tzAtEntry ?? null,
          updatedAt: now,
        },
      })
      .returning({
        id: diaryEntries.id,
        entryDate: diaryEntries.entryDate,
        ciphertext: diaryEntries.ciphertext,
        nonce: diaryEntries.nonce,
        aad: diaryEntries.aad,
        wordCount: diaryEntries.wordCount,
        mood: diaryEntries.mood,
        tzAtEntry: diaryEntries.tzAtEntry,
      });

    if (!row) {
      throw new Error('ENTRY_NOT_FOUND');
    }

    const sharedWith = await this.listSharedProfessionals(row.id, userId);

    return mapEntryRow({ ...row, sharedWith });
  },

  async listEntriesMeta(userId: string, range: DiaryEntryMetaRange) {
    const rows = await db
      .select({
        id: diaryEntries.id,
        entryDate: diaryEntries.entryDate,
        wordCount: diaryEntries.wordCount,
        mood: diaryEntries.mood,
        tzAtEntry: diaryEntries.tzAtEntry,
      })
      .from(diaryEntries)
      .where(
        and(
          eq(diaryEntries.userId, userId),
          gte(diaryEntries.entryDate, range.from),
          lte(diaryEntries.entryDate, range.to),
        ),
      )
      .orderBy(diaryEntries.entryDate);

    const entryIds = rows.map(row => row.id);
    const shareMap = await listSharesForEntries(entryIds, userId);
    const goalMap = await listGoalLinksForEntries(entryIds);

    const metas: DiaryEntryMeta[] = rows.map(row => ({
      dateISO: row.entryDate,
      wordCount: row.wordCount ?? undefined,
      mood: row.mood ?? undefined,
      tzAtEntry: row.tzAtEntry ?? undefined,
      sharedProfessionalIds: shareMap.get(row.id)?.map(share => share.professionalId),
      goalIds: goalMap.get(row.id),
    }));

    return metas;
  },

  async linkGoalToEntry(link: DiaryGoalLink) {
    const entryOwner = await getEntryOwner(link.entryId);
    const goalOwner = await getGoalOwner(link.goalId);

    if (entryOwner !== goalOwner) {
      throw new Error('FORBIDDEN_LINK');
    }

    await db
      .insert(diaryGoalEntries)
      .values({ goalId: link.goalId, entryId: link.entryId })
      .onConflictDoNothing();
  },

  async unlinkGoalFromEntry(link: DiaryGoalLink) {
    await db
      .delete(diaryGoalEntries)
      .where(
        and(
          eq(diaryGoalEntries.goalId, link.goalId),
          eq(diaryGoalEntries.entryId, link.entryId),
        ),
      );
  },

  async listGoals(userId: string) {
    const rows = await db
      .select({
        id: diaryGoals.id,
        ciphertext: diaryGoals.ciphertext,
        nonce: diaryGoals.nonce,
        aad: diaryGoals.aad,
        createdAt: diaryGoals.createdAt,
        updatedAt: diaryGoals.updatedAt,
        deadlineDate: diaryGoals.deadlineDate,
      })
      .from(diaryGoals)
      .where(eq(diaryGoals.userId, userId))
      .orderBy(desc(diaryGoals.updatedAt));

    return rows.map(mapGoalRow);
  },

  async upsertGoal(userId: string, payload: DiaryGoalWrite) {
    const now = new Date();

    if (payload.id) {
      const owner = await getGoalOwner(payload.id);

      if (owner !== userId) {
        throw new Error('GOAL_NOT_FOUND');
      }

      const [updated] = await db
        .update(diaryGoals)
        .set({
          ciphertext: payload.ciphertext,
          nonce: payload.nonce,
          aad: payload.aad ?? null,
          deadlineDate: payload.deadlineISO ?? null,
          updatedAt: now,
        })
        .where(and(eq(diaryGoals.id, payload.id), eq(diaryGoals.userId, userId)))
        .returning({
          id: diaryGoals.id,
          ciphertext: diaryGoals.ciphertext,
          nonce: diaryGoals.nonce,
          aad: diaryGoals.aad,
          createdAt: diaryGoals.createdAt,
          updatedAt: diaryGoals.updatedAt,
          deadlineDate: diaryGoals.deadlineDate,
        });

      if (!updated) {
        throw new Error('GOAL_NOT_FOUND');
      }

      return mapGoalRow(updated);
    }

    const [created] = await db
      .insert(diaryGoals)
      .values({
        userId,
        ciphertext: payload.ciphertext,
        nonce: payload.nonce,
        aad: payload.aad ?? null,
        deadlineDate: payload.deadlineISO ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: diaryGoals.id,
        ciphertext: diaryGoals.ciphertext,
        nonce: diaryGoals.nonce,
        aad: diaryGoals.aad,
        createdAt: diaryGoals.createdAt,
        updatedAt: diaryGoals.updatedAt,
        deadlineDate: diaryGoals.deadlineDate,
      });

    return mapGoalRow(created);
  },

  async deleteGoal(userId: string, goalId: string) {
    await db
      .delete(diaryGoals)
      .where(and(eq(diaryGoals.id, goalId), eq(diaryGoals.userId, userId)));
  },

  async listSharedProfessionals(entryId: string, userId: string) {
    const owner = await getEntryOwner(entryId);

    if (owner !== userId) {
      throw new Error('ENTRY_NOT_FOUND');
    }

    const rows = await db
      .select({
        professionalId: diaryShares.professionalUserId,
        sharedAt: diaryShares.updatedAt,
      })
      .from(diaryShares)
      .where(
        and(
          eq(diaryShares.ownerUserId, userId),
          eq(diaryShares.entryId, entryId),
        ),
      )
      .orderBy(diaryShares.updatedAt);

    return rows.map(row => ({
      professionalId: row.professionalId,
      sharedAt: row.sharedAt.toISOString(),
    }));
  },

  async shareEntry(
    userId: string,
    entryId: string,
    professionalId: string,
    envelope: DiaryShareEnvelope,
  ) {
    const owner = await getEntryOwner(entryId);

    if (owner !== userId) {
      throw new Error('ENTRY_NOT_FOUND');
    }
    await ensureProfessionalLink(userId, professionalId);

    const now = new Date();

    const [row] = await db
      .insert(diaryShares)
      .values({
        entryId,
        ownerUserId: userId,
        professionalUserId: professionalId,
        envelope,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          diaryShares.ownerUserId,
          diaryShares.entryId,
          diaryShares.professionalUserId,
        ],
        set: {
          envelope,
          updatedAt: now,
        },
      })
      .returning({
        professionalId: diaryShares.professionalUserId,
        updatedAt: diaryShares.updatedAt,
      });

    await db.insert(diaryShareAudits).values({
      entryId,
      ownerUserId: userId,
      professionalUserId: professionalId,
      action: 'shared',
      eventAt: now,
    });

    if (!row) {
      throw new Error('SHARE_NOT_CREATED');
    }

    return {
      professionalId: row.professionalId,
      sharedAt: row.updatedAt.toISOString(),
    };
  },

  async revokeShare(userId: string, entryId: string, professionalId: string) {
    const owner = await getEntryOwner(entryId);

    if (owner !== userId) {
      throw new Error('ENTRY_NOT_FOUND');
    }

    const now = new Date();

    const [deleted] = await db
      .delete(diaryShares)
      .where(
        and(
          eq(diaryShares.ownerUserId, userId),
          eq(diaryShares.entryId, entryId),
          eq(diaryShares.professionalUserId, professionalId),
        ),
      )
      .returning({ id: diaryShares.id });

    if (deleted) {
      await db.insert(diaryShareAudits).values({
        entryId,
        ownerUserId: userId,
        professionalUserId: professionalId,
        action: 'revoked',
        eventAt: now,
      });
    }
  },

  async listCoachPrompts(filter: DiaryCoachPromptFilter) {
    const conditions = buildPromptConditions(filter);

    const rows = await db
      .select({
        id: diaryCoachPrompts.id,
        locale: diaryCoachPrompts.locale,
        scope: diaryCoachPrompts.scope,
        text: diaryCoachPrompts.text,
        tags: diaryCoachPrompts.tags,
        weight: diaryCoachPrompts.weight,
        enabled: diaryCoachPrompts.enabled,
        startAt: diaryCoachPrompts.startAt,
        endAt: diaryCoachPrompts.endAt,
        createdAt: diaryCoachPrompts.createdAt,
        updatedAt: diaryCoachPrompts.updatedAt,
      })
      .from(diaryCoachPrompts)
      .where(and(...conditions))
      .orderBy(desc(diaryCoachPrompts.weight), desc(diaryCoachPrompts.createdAt));

    if (filter.tags && filter.tags.length > 0) {
      const tagSet = new Set(filter.tags);
      return rows
        .filter(row => row.tags.some((tag: string) => tagSet.has(tag)))
        .map(mapPromptRow);
    }

    return rows.map(mapPromptRow);
  },

  async createCoachPrompt(input: DiaryCoachPromptInput) {
    const now = new Date();

    const [row] = await db
      .insert(diaryCoachPrompts)
      .values({
        locale: input.locale,
        scope: input.scope,
        text: input.text,
        tags: input.tags,
        weight: input.weight,
        enabled: input.enabled,
        startAt: input.startAt ? new Date(input.startAt) : null,
        endAt: input.endAt ? new Date(input.endAt) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: diaryCoachPrompts.id,
        locale: diaryCoachPrompts.locale,
        scope: diaryCoachPrompts.scope,
        text: diaryCoachPrompts.text,
        tags: diaryCoachPrompts.tags,
        weight: diaryCoachPrompts.weight,
        enabled: diaryCoachPrompts.enabled,
        startAt: diaryCoachPrompts.startAt,
        endAt: diaryCoachPrompts.endAt,
        createdAt: diaryCoachPrompts.createdAt,
        updatedAt: diaryCoachPrompts.updatedAt,
      });

    return mapPromptRow(row);
  },

  async updateCoachPrompt(id: string, patch: DiaryCoachPromptPatch) {
    const now = new Date();

    const updatePayload: Partial<DiaryCoachPromptMutableFields> = {
      updatedAt: now,
    };

    if (patch.locale !== undefined) {
      updatePayload.locale = patch.locale;
    }
    if (patch.scope !== undefined) {
      updatePayload.scope = patch.scope;
    }
    if (patch.text !== undefined) {
      updatePayload.text = patch.text;
    }
    if (patch.tags !== undefined) {
      updatePayload.tags = patch.tags;
    }
    if (patch.weight !== undefined) {
      updatePayload.weight = patch.weight;
    }
    if (patch.enabled !== undefined) {
      updatePayload.enabled = patch.enabled;
    }
    if (patch.startAt !== undefined) {
      updatePayload.startAt = patch.startAt ? new Date(patch.startAt) : null;
    }
    if (patch.endAt !== undefined) {
      updatePayload.endAt = patch.endAt ? new Date(patch.endAt) : null;
    }

    const [row] = await db
      .update(diaryCoachPrompts)
      .set(updatePayload)
      .where(eq(diaryCoachPrompts.id, id))
      .returning({
        id: diaryCoachPrompts.id,
        locale: diaryCoachPrompts.locale,
        scope: diaryCoachPrompts.scope,
        text: diaryCoachPrompts.text,
        tags: diaryCoachPrompts.tags,
        weight: diaryCoachPrompts.weight,
        enabled: diaryCoachPrompts.enabled,
        startAt: diaryCoachPrompts.startAt,
        endAt: diaryCoachPrompts.endAt,
        createdAt: diaryCoachPrompts.createdAt,
        updatedAt: diaryCoachPrompts.updatedAt,
      });

    if (!row) {
      throw new Error('PROMPT_NOT_FOUND');
    }

    return mapPromptRow(row);
  },

  async deleteCoachPrompt(id: string) {
    await db.delete(diaryCoachPrompts).where(eq(diaryCoachPrompts.id, id));
  },
};
