import { neon } from '@neondatabase/serverless';
import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';

// Ensure DATABASE_URL is available when running scripts outside Next.js
if (!process.env.DATABASE_URL) {
  loadEnv({ path: '.env' });
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

const neonClient = neon(connectionString);

export const db = drizzle({ client: neonClient });

export const getDb = () => db;
