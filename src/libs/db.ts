import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof drizzle>;
};

export function getDb() {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set');
    }
    const sql = neon(url);
    globalForDb.db = drizzle(sql);
  }
  return globalForDb.db;
}
