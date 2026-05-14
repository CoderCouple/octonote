import type { Command } from 'commander';
import type { Container, StorageFormat } from '@octonote/core';
import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { Editor } from '../tui/Editor.js';

export function registerNewCommand(program: Command, container: Container): void {
  program
    .command('new [title]')
    .description('Create a new note and open the editor')
    .option('-f, --folder <folderId>', 'Place in folder')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('--md', 'Use markdown storage format')
    .action(async (title: string | undefined, opts: { folder?: string; tags?: string; md?: boolean }) => {
      const noteTitle = title || `Note ${new Date().toISOString().slice(0, 16)}`;
      const fmt: StorageFormat = opts.md ? 'markdown' : 'json';
      const note = await container.noteRepository.createNote(noteTitle, opts.folder || null, fmt);

      // Add tags
      if (opts.tags) {
        for (const tag of opts.tags.split(',').map(t => t.trim()).filter(Boolean)) {
          await container.noteRepository.addTagToNote(note.id, tag);
        }
      }

      // Fetch fresh note with blocks + tags
      const fullNote = (await container.noteRepository.getNote(note.id))!;

      console.log(chalk.dim(`Created "${noteTitle}" — opening editor...`));

      const { waitUntilExit } = render(
        React.createElement(Editor, { container, note: fullNote })
      );
      await waitUntilExit();
    });
}
