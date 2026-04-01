#!/usr/bin/env node

import { Command } from 'commander';
import { createContainer } from '@octonote/core';
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

const program = new Command();
program
  .name('octo')
  .description('OctoNote — CLI-first block-based note-taking')
  .version('0.1.0');

const container = createContainer();

// Read-only commands
registerViewCommand(program, container);
registerListCommand(program, container);
registerSearchCommand(program, container);
registerTodayCommand(program, container);
registerLinkCommand(program, container);

// Mutating commands
registerTagCommand(program, container);
registerDeleteCommand(program, container);
registerConfigCommand(program, container);
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
