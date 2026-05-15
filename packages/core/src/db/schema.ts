import * as path from 'path';
import { Pool } from 'pg';

// node-pg-migrate is ESM-only. This package compiles to CommonJS, so a plain
// `import()` would be down-leveled to `require()` and fail. Loading it through
// a Function-wrapped import keeps it a genuine runtime dynamic import.
const importESM = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<any>;

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

/**
 * Apply any pending migrations, then return a connection pool. Migrations are
 * the schema source of truth — see packages/core/migrations/.
 */
export async function initDatabase(connectionString: string): Promise<Pool> {
  const { runner } = await importESM('node-pg-migrate');

  await runner({
    databaseUrl: connectionString,
    dir: MIGRATIONS_DIR,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    logger: {
      info: () => {},
      warn: (msg: string) => console.warn(msg),
      error: (msg: string) => console.error(msg),
    },
  });

  return new Pool({ connectionString });
}
