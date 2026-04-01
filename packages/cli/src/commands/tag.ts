import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import { resolveNote } from '../utils/resolveNote.js';

export function registerTagCommand(program: Command, container: Container): void {
  program
    .command('tag <titleOrId> [tagName]')
    .description('Add, remove, or list tags on a note')
    .option('-r, --remove', 'Remove the tag instead of adding')
    .option('-l, --list', 'List tags on the note')
    .action((titleOrId: string, tagName: string | undefined, opts: { remove?: boolean; list?: boolean }) => {
      const note = resolveNote(container, titleOrId);
      const tags = container.noteRepository.getNoteTags(note.id);

      if (opts.list || !tagName) {
        if (tags.length === 0) {
          console.log(chalk.dim('No tags.'));
        } else {
          for (const t of tags) {
            console.log(`  ${chalk.cyan(`#${t.name}`)}`);
          }
        }
        return;
      }

      if (opts.remove) {
        const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (!tag) {
          console.error(`Tag "${tagName}" not found on this note.`);
          process.exit(1);
        }
        container.noteRepository.removeTagFromNote(note.id, tag.id);
        console.log(`Removed ${chalk.cyan(`#${tagName}`)} from "${note.title}"`);
      } else {
        container.noteRepository.addTagToNote(note.id, tagName);
        console.log(`Added ${chalk.cyan(`#${tagName}`)} to "${note.title}"`);
      }
    });
}
