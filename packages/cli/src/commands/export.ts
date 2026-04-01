import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import * as path from 'path';
import chalk from 'chalk';
import { resolveNote } from '../utils/resolveNote.js';

export function registerExportCommand(program: Command, container: Container): void {
  program
    .command('export <titleOrId> [dest]')
    .description('Export a note as markdown')
    .action((titleOrId: string, dest: string | undefined) => {
      const note = resolveNote(container, titleOrId);
      const blocks = note.blocks || [];
      const safeTitle = note.title.replace(/[<>:"/\\|?*]/g, '_');
      const destPath = dest || path.resolve(`./${safeTitle}.md`);

      container.vaultManager.exportToMarkdown(note, blocks, destPath);
      console.log(`Exported to ${chalk.green(destPath)}`);
    });
}
