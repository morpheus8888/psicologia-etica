import { and, eq } from 'drizzle-orm';

import type { ProDirectoryAdapter, ProfessionalSummary } from '@/features/diary/adapters/types';
import { db } from '@/libs/db';
import { users } from '@/models/auth';
import {
  professionalPublicKeys,
  userProfessionalLinks,
} from '@/models/professional';

const mapProfessionalRow = (row: {
  id: string;
  name: string | null;
  familyName: string | null;
  email: string;
}): ProfessionalSummary => {
  const pieces = [row.name, row.familyName].filter(Boolean);
  const displayName = pieces.length > 0 ? pieces.join(' ') : row.email;

  return {
    id: row.id,
    displayName,
  };
};

export const proDirectoryAdapter: ProDirectoryAdapter = {
  async listMyProfessionals(userId) {
    const rows = await db
      .select({
        id: userProfessionalLinks.professionalUserId,
        name: users.name,
        familyName: users.familyName,
        email: users.email,
      })
      .from(userProfessionalLinks)
      .innerJoin(
        users,
        eq(users.id, userProfessionalLinks.professionalUserId),
      )
      .where(
        and(
          eq(userProfessionalLinks.userId, userId),
          eq(userProfessionalLinks.status, 'active'),
        ),
      );

    return rows.map(mapProfessionalRow);
  },

  async getProfessionalPublicKey(professionalId) {
    const [row] = await db
      .select({ publicKey: professionalPublicKeys.publicKey })
      .from(professionalPublicKeys)
      .where(eq(professionalPublicKeys.professionalUserId, professionalId))
      .limit(1);

    if (!row) {
      throw new Error('PROFESSIONAL_KEY_NOT_FOUND');
    }

    return row.publicKey;
  },
};
