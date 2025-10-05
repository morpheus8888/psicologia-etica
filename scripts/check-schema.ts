import 'dotenv/config';

import type { NeonQueryFunction } from '@neondatabase/serverless';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const safeConnectionString = connectionString;

const neonClient = neon(safeConnectionString);

const neonProxy = Object.assign(
  ((strings: TemplateStringsArray | string, ...rest: any[]) => {
    if (Array.isArray(strings)) {
      return (neonClient as any)(strings, ...rest);
    }
    const [params, options] = rest as [unknown[] | undefined, any];
    return neonClient.query(strings as string, params, options);
  }) as NeonQueryFunction<boolean, boolean>,
  {
    query: neonClient.query.bind(neonClient),
    unsafe: neonClient.unsafe.bind(neonClient),
    transaction: neonClient.transaction.bind(neonClient),
  },
);

const db = drizzle(neonProxy);

async function main() {
  const dbInfo = await db.execute(sql`select current_database() as db_name, current_schema() as schema_name`);
  const tablesResult = await db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = current_schema()
    order by table_name
  `);

  const dbRows = (dbInfo as any)?.rows ?? (Array.isArray(dbInfo) ? dbInfo : []);
  const tablesRows = (tablesResult as any)?.rows ?? (Array.isArray(tablesResult) ? tablesResult : []);

  console.log('connectionFingerprint', safeConnectionString.slice(-20));
  console.log('dbRows', dbRows);
  console.log('tablesRows', tablesRows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
