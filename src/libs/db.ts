import type { HTTPQueryOptions, NeonQueryFunction } from '@neondatabase/serverless';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

const neonClient = neon(connectionString);

const neonProxy = Object.assign(
  ((strings: TemplateStringsArray | string, ...rest: any[]) => {
    if (Array.isArray(strings)) {
      return (neonClient as any)(strings, ...rest);
    }
    const [params, options] = rest as [unknown[] | undefined, HTTPQueryOptions<boolean, boolean> | undefined];
    return neonClient.query(strings as string, params, options);
  }) as NeonQueryFunction<boolean, boolean>,
  {
    query: neonClient.query.bind(neonClient),
    unsafe: neonClient.unsafe.bind(neonClient),
    transaction: neonClient.transaction.bind(neonClient),
  },
);

export const db = drizzle(neonProxy);
