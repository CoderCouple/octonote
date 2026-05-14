import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import { resolveNote } from '../utils/resolveNote.js';
import { outputJson, isJsonOutput } from '../utils/output.js';

export function registerViewCommand(program: Command, container: Container): void {
  program
    .command('view <titleOrId>')
    .description('View a note')
    .option('-o, --output <format>', 'Output format (json)')
    .action(async (titleOrId: string, opts: { output?: string }) => {
      const note = await resolveNote(container, titleOrId);

      if (isJsonOutput(opts)) {
        outputJson(note);
        return;
      }

      // Terminal rendering
      console.log(chalk.bold.underline(note.title));
      if (note.tags?.length) {
        console.log(chalk.dim('Tags: ') + note.tags.map(t => chalk.cyan(`#${t.name}`)).join(' '));
      }
      console.log(chalk.dim(`Created: ${note.createdAt}  Updated: ${note.updatedAt}`));
      console.log();

      if (note.blocks?.length) {
        const rendered = container.blockEngine.renderForTerminal(note.blocks);
        console.log(rendered);
      }
    });
}
