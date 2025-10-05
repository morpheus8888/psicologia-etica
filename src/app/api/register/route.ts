import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getDb } from '@/libs/db';
import { users } from '@/models/auth';

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const db = getDb();

  const email = parsed.data.email.toLowerCase().trim();
  const name = parsed.data.name ?? null;
  const password = parsed.data.password;

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 });
    }

    const totalUsersResult = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(users);

    const totalUsers = totalUsersResult[0]?.value ?? 0;
    const role = totalUsers === 0 ? 'admin' : 'user';
    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        role,
      })
      .returning({ id: users.id });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[register] error', error);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
