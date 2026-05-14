import { createContainer } from '@octonote/core';
import { startServer } from './start';

/**
 * Production entrypoint (Railway). Reads DATABASE_URL and PORT from the
 * environment — both are injected by Railway when a Postgres plugin is linked.
 */
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Link a Postgres database to this service.');
  }

  const container = await createContainer(process.env.DATABASE_URL);
  startServer(container, { open: false });

  const shutdown = async () => {
    await container.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
