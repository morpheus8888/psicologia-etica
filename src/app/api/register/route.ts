import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/libs/db';
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

  const email = parsed.data.email.toLowerCase().trim();
  const name = parsed.data.name ?? null;
  const password = parsed.data.password;

  const connectionString = process.env.DATABASE_URL;
  const connectionFingerprint = connectionString
    ? `${connectionString.slice(0, 8)}…${connectionString.slice(-8)}`
    : 'missing';

  let connectionHost: string | undefined;
  if (connectionString) {
    try {
      const parsed = new URL(connectionString.replace('postgresql', 'http'));
      connectionHost = parsed.host;
    } catch (error) {
      connectionHost = `unparsed: ${(error as Error).message}`;
    }
  }

  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelRegion: process.env.VERCEL_REGION,
    vercelUrl: process.env.VERCEL_URL,
  } satisfies Record<string, string | undefined>;

  let diagnostics: Record<string, unknown> = {
    connectionFingerprint,
    connectionHost,
    env: envInfo,
  };

  try {
    const dbInfo = await db.execute(sql`select current_database() as db_name, current_schema() as schema_name`);
    const tablesResult = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = current_schema()
      order by table_name
    `);

    const dbRows = (dbInfo as unknown as { rows?: Array<Record<string, unknown>>; length?: number })?.rows
      ?? (Array.isArray(dbInfo) ? dbInfo : []);
    const tablesRows = (tablesResult as unknown as { rows?: Array<{ table_name: string }> })?.rows
      ?? (Array.isArray(tablesResult) ? tablesResult : []);

    let usersCount: number | null = null;
    let usersCountError: string | undefined;
    try {
      const countResult = await db.execute(sql`select count(*)::int as count from users`);
      const countRows = (countResult as unknown as { rows?: Array<{ count: number }> })?.rows
        ?? (Array.isArray(countResult) ? countResult : []);
      usersCount = countRows[0]?.count ?? null;
    } catch (countError) {
      usersCountError = countError instanceof Error ? countError.message : String(countError);
    }

    diagnostics = {
      connectionFingerprint,
      connectionHost,
      env: envInfo,
      db: dbRows[0] ?? null,
      tables: tablesRows.map(row => row.table_name ?? row),
      hasUsersTable: tablesRows.some(row => row.table_name === 'users'),
      usersCount,
      usersCountError,
      driver: 'drizzle(neon-http) via @neondatabase/serverless',
    };
  } catch (diagnosticError) {
    diagnostics = {
      connectionFingerprint,
      connectionHost,
      env: envInfo,
      diagnosticError: diagnosticError instanceof Error
        ? { name: diagnosticError.name, message: diagnosticError.message, stack: diagnosticError.stack }
        : diagnosticError,
    };
  }

  console.error('[register] diagnostics', diagnostics);

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
    const details = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: (error as { cause?: unknown }).cause,
        }
      : { message: String(error) };

    const message = details.message ?? 'UNKNOWN_ERROR';
    const isMissingTable = message.includes('relation "users"') || message.includes('users" does not exist');
    const code = isMissingTable ? 'MIGRATIONS_MISSING' : 'UNKNOWN';

    console.error('[register] error', {
      email,
      code,
      details,
    });

    return NextResponse.json({ error: code, message, diagnostics }, { status: 500 });
  }
}

export const runtime = 'nodejs';
