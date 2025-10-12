import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { db } from '@/libs/db';
import { users } from '@/models/auth';

const REQUIRED_ENV = ['DATABASE_URL', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL!.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD!;
  const name = process.env.SEED_ADMIN_NAME?.trim() ?? null;
  const familyName = process.env.SEED_ADMIN_FAMILY_NAME?.trim() ?? null;

  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters long');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [existing] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    await db
      .update(users)
      .set({
        role: 'admin',
        passwordHash,
        name,
        familyName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));

    console.log(`Updated admin user: ${email}`);
  } else {
    await db.insert(users).values({
      email,
      passwordHash,
      role: 'admin',
      name,
      familyName,
    });

    console.log(`Created admin user: ${email}`);
  }
}

main()
  .then(() => {
    console.log('Seed completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed admin user:', error);
    process.exit(1);
  });
