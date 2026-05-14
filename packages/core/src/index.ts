import * as path from 'path';
import * as os from 'os';
import { Pool } from 'pg';
import { initDatabase } from './db/schema';
import { NoteRepository } from './db/NoteRepository';
import { BlockEngine } from './engine/BlockEngine';
import { SearchEngine } from './engine/SearchEngine';
import { LinkGraph } from './engine/LinkGraph';
import { VaultManager } from './engine/VaultManager';
import { DailyNoteService } from './engine/DailyNoteService';

export interface Container {
  pool: Pool;
  noteRepository: NoteRepository;
  blockEngine: BlockEngine;
  searchEngine: SearchEngine;
  linkGraph: LinkGraph;
  vaultManager: VaultManager;
  dailyNoteService: DailyNoteService;
  close(): Promise<void>;
}

const DEFAULT_VAULT_PATH = path.join(os.homedir(), '.octonote');

export async function createContainer(
  databaseUrl?: string,
  vaultPath: string = DEFAULT_VAULT_PATH
): Promise<Container> {
  const connectionString = databaseUrl || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'Database connection string required. Set DATABASE_URL environment variable or pass it to createContainer().'
    );
  }

  const indexPath = path.join(vaultPath, 'search.idx');

  // Ensure vault dir exists
  const fs = require('fs');
  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath, { recursive: true });
  }

  const pool = await initDatabase(connectionString);
  const noteRepository = new NoteRepository(pool);
  const blockEngine = new BlockEngine();
  const searchEngine = new SearchEngine(indexPath);
  const linkGraph = new LinkGraph(noteRepository);
  const vaultManager = new VaultManager(vaultPath, blockEngine);
  const dailyNoteService = new DailyNoteService(noteRepository);

  // Ensure vault directory structure
  vaultManager.ensureVault();

  return {
    pool,
    noteRepository,
    blockEngine,
    searchEngine,
    linkGraph,
    vaultManager,
    dailyNoteService,
    async close() {
      await pool.end();
    },
  };
}

// Re-export all types and classes
export * from './models/types';
export { initDatabase } from './db/schema';
export { NoteRepository } from './db/NoteRepository';
export { BlockEngine } from './engine/BlockEngine';
export { SearchEngine } from './engine/SearchEngine';
export { LinkGraph } from './engine/LinkGraph';
export { VaultManager } from './engine/VaultManager';
export { DailyNoteService } from './engine/DailyNoteService';
