#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';
import { createContainer, VaultManager, BlockEngine } from '@octonote/core';
import { registerViewCommand } from './commands/view.js';
import { registerListCommand } from './commands/list.js';
import { registerSearchCommand } from './commands/search.js';
import { registerTodayCommand } from './commands/today.js';
import { registerLinkCommand } from './commands/link.js';
import { registerTagCommand } from './commands/tag.js';
import { registerDeleteCommand } from './commands/delete.js';
import { registerConfigCommand } from './commands/config.js';
import { registerExportCommand } from './commands/export.js';
import { registerImportCommand } from './commands/import.js';
import { registerNewCommand } from './commands/new.js';
import { registerEditCommand } from './commands/edit.js';
import { registerAiCommand } from './commands/ai.js';
import { registerServeCommand } from './commands/serve.js';

const DEFAULT_VAULT_PATH = path.join(os.homedir(), '.octonote');

/**
 * Resolve the PostgreSQL connection string: env var first, then config.json.
 * Returns null when neither is set.
 */
function resolveDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const configPath = path.join(DEFAULT_VAULT_PATH, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (typeof config.databaseUrl === 'string' && config.databaseUrl) {
        return config.databaseUrl;
      }
    } catch {
      // malformed config — fall through to null
    }
  }
  return null;
}

async function main() {
  const program = new Command();
  program
    .name('octo')
    .description('OctoNote — CLI-first block-based note-taking')
    .version('0.1.0');

  // `config` never needs a DB connection — handle it standalone so it always
  // works, even when no database is set yet or the saved URL is unreachable.
  if (process.argv[2] === 'config') {
    const vaultManager = new VaultManager(DEFAULT_VAULT_PATH, new BlockEngine());
    vaultManager.ensureVault();
    registerConfigCommand(program, vaultManager);
    program.parse();
    return;
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    console.error(
      'No database connection configured.\n' +
        'Set the DATABASE_URL environment variable, or run:\n' +
        '  octo config --db <postgres-connection-string>'
    );
    process.exit(1);
  }

  const container = await createContainer(databaseUrl);

  // Read-only commands
  registerViewCommand(program, container);
  registerListCommand(program, container);
  registerSearchCommand(program, container);
  registerTodayCommand(program, container);
  registerLinkCommand(program, container);

  // Mutating commands
  registerTagCommand(program, container);
  registerDeleteCommand(program, container);
  registerConfigCommand(program, container.vaultManager);
  registerExportCommand(program, container);
  registerImportCommand(program, container);

  // TUI commands
  registerNewCommand(program, container);
  registerEditCommand(program, container);

  // AI
  registerAiCommand(program, container);

  // Server
  registerServeCommand(program, container);

  program.parse();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
