import { eq } from 'drizzle-orm';

import type { DiaryKdfParams, KeyringStoreAdapter } from '@/features/diary/adapters/types';
import { db } from '@/libs/db';
import { diaryKeyrings } from '@/models/diary';

export const keyringStoreAdapter: KeyringStoreAdapter = {
  async getEncMasterKey(userId) {
    const [row] = await db
      .select({
        encMasterKey: diaryKeyrings.encMasterKey,
        salt: diaryKeyrings.salt,
        kdfParams: diaryKeyrings.kdfParams,
        createdAt: diaryKeyrings.createdAt,
        updatedAt: diaryKeyrings.updatedAt,
      })
      .from(diaryKeyrings)
      .where(eq(diaryKeyrings.userId, userId))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      encMasterKey: row.encMasterKey,
      salt: row.salt,
      kdfParams: row.kdfParams as DiaryKdfParams,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  },

  async putEncMasterKey(userId, data) {
    await db
      .insert(diaryKeyrings)
      .values({
        userId,
        encMasterKey: data.encMasterKey,
        salt: data.salt,
        kdfParams: data.kdfParams,
      })
      .onConflictDoUpdate({
        target: diaryKeyrings.userId,
        set: {
          encMasterKey: data.encMasterKey,
          salt: data.salt,
          kdfParams: data.kdfParams,
          updatedAt: new Date(),
        },
      });
  },
};
