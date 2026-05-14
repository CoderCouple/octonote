import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import { outputJson, isJsonOutput } from '../utils/output.js';

export function registerListCommand(program: Command, container: Container): void {
  program
    .command('list')
    .alias('ls')
    .description('List notes')
    .option('-f, --folder <folderId>', 'Filter by folder')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('-o, --output <format>', 'Output format (json)')
    .action(async (opts: { folder?: string; tag?: string; output?: string }) => {
      const notes = await container.noteRepository.listNotes({
        folderId: opts.folder,
        tag: opts.tag,
      });

      if (isJsonOutput(opts)) {
        outputJson(notes);
        return;
      }

      if (notes.length === 0) {
        console.log(chalk.dim('No notes found.'));
        return;
      }

      // Tabular display
      const maxTitle = Math.min(50, Math.max(...notes.map(n => n.title.length)));
      for (const note of notes) {
        const title = note.title.padEnd(maxTitle);
        const date = note.updatedAt.slice(0, 10);
        const tags = note.tags?.map(t => chalk.cyan(`#${t.name}`)).join(' ') || '';
        console.log(`  ${chalk.bold(title)}  ${chalk.dim(date)}  ${tags}`);
      }
      console.log(chalk.dim(`\n${notes.length} note(s)`));
    });
}
