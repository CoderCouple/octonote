import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { resolveNote } from '../utils/resolveNote.js';

export function registerDeleteCommand(program: Command, container: Container): void {
  program
    .command('delete <titleOrId>')
    .alias('rm')
    .description('Delete a note')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (titleOrId: string, opts: { yes?: boolean }) => {
      const note = await resolveNote(container, titleOrId);

      if (!opts.yes) {
        const confirmed = await confirm(`Delete "${note.title}"? (y/N) `);
        if (!confirmed) {
          console.log(chalk.dim('Cancelled.'));
          return;
        }
      }

      container.searchEngine.removeNote(note.id);
      await container.noteRepository.deleteNote(note.id);
      console.log(`Deleted "${note.title}"`);
    });
}

function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}
