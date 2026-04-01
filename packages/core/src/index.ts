import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import { initDatabase } from './db/schema';
import { NoteRepository } from './db/NoteRepository';
import { BlockEngine } from './engine/BlockEngine';
import { SearchEngine } from './engine/SearchEngine';
import { LinkGraph } from './engine/LinkGraph';
import { VaultManager } from './engine/VaultManager';
import { DailyNoteService } from './engine/DailyNoteService';

export interface Container {
  db: Database.Database;
  noteRepository: NoteRepository;
  blockEngine: BlockEngine;
  searchEngine: SearchEngine;
  linkGraph: LinkGraph;
  vaultManager: VaultManager;
  dailyNoteService: DailyNoteService;
}

const DEFAULT_VAULT_PATH = path.join(os.homedir(), '.octonote');

export function createContainer(vaultPath: string = DEFAULT_VAULT_PATH): Container {
  const dbPath = path.join(vaultPath, 'octonote.db');
  const indexPath = path.join(vaultPath, 'search.idx');

  // Ensure vault dir exists
  const fs = require('fs');
  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath, { recursive: true });
  }

  const db = initDatabase(dbPath);
  const noteRepository = new NoteRepository(db);
  const blockEngine = new BlockEngine();
  const searchEngine = new SearchEngine(indexPath);
  const linkGraph = new LinkGraph(noteRepository);
  const vaultManager = new VaultManager(vaultPath, blockEngine);
  const dailyNoteService = new DailyNoteService(noteRepository);

  // Ensure vault directory structure
  vaultManager.ensureVault();

  return {
    db,
    noteRepository,
    blockEngine,
    searchEngine,
    linkGraph,
    vaultManager,
    dailyNoteService,
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
