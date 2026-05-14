import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import { resolveNote } from '../utils/resolveNote.js';

export function registerLinkCommand(program: Command, container: Container): void {
  program
    .command('link <titleOrId>')
    .description('Show links for a note')
    .action(async (titleOrId: string) => {
      const note = await resolveNote(container, titleOrId);

      const forward = await container.linkGraph.getForwardLinks(note.id);
      const backlinks = await container.linkGraph.getBacklinks(note.id);

      console.log(chalk.bold.underline(note.title));
      console.log();

      if (forward.length > 0) {
        console.log(chalk.bold('Forward links:'));
        for (const link of forward) {
          const target = await container.noteRepository.getNote(link.targetNoteId);
          const title = target?.title || link.targetNoteId;
          const alias = link.alias ? chalk.dim(` (${link.alias})`) : '';
          console.log(`  ${chalk.magenta('→')} ${title}${alias}`);
        }
      } else {
        console.log(chalk.dim('No forward links.'));
      }

      console.log();

      if (backlinks.length > 0) {
        console.log(chalk.bold('Backlinks:'));
        for (const link of backlinks) {
          const source = await container.noteRepository.getNote(link.sourceNoteId);
          const title = source?.title || link.sourceNoteId;
          console.log(`  ${chalk.cyan('←')} ${title}`);
        }
      } else {
        console.log(chalk.dim('No backlinks.'));
      }
    });
}
