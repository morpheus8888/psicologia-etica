import { eq } from 'drizzle-orm';

import type { ProfileAdapter } from '@/features/diary/adapters/types';
import { db } from '@/libs/db';
import { users } from '@/models/auth';

export const profileAdapter: ProfileAdapter = {
  async getUserProfile(userId) {
    const [row] = await db
      .select({
        avatarAnimal: users.avatar,
        timezone: users.timezone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      avatarAnimal: row.avatarAnimal,
      timezone: row.timezone,
    };
  },
};
