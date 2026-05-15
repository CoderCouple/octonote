import type { Command } from 'commander';
import type { Container, StorageFormat, NoteType } from '@octonote/core';
import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { Editor } from '../tui/Editor.js';

const NOTE_TYPES: NoteType[] = [
  'note', 'meeting', 'diagram', 'plan', 'decision', 'gotcha', 'reference', 'explanation',
];

export function registerNewCommand(program: Command, container: Container): void {
  program
    .command('new [title]')
    .description('Create a new note and open the editor')
    .option('-f, --folder <folderId>', 'Place in folder')
    .option('-p, --project <slug>', 'Place under a project (by slug)')
    .option('--type <type>', `Note type (${NOTE_TYPES.join(', ')})`, 'note')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('--md', 'Use markdown storage format')
    .action(async (title: string | undefined, opts: { folder?: string; project?: string; type?: string; tags?: string; md?: boolean }) => {
      const noteTitle = title || `Note ${new Date().toISOString().slice(0, 16)}`;
      const fmt: StorageFormat = opts.md ? 'markdown' : 'json';

      const type = (opts.type || 'note') as NoteType;
      if (!NOTE_TYPES.includes(type)) {
        console.error(`Invalid --type "${opts.type}". Valid: ${NOTE_TYPES.join(', ')}`);
        process.exit(1);
      }

      let projectId: string | null = null;
      if (opts.project) {
        const project = await container.noteRepository.getProjectBySlug(opts.project);
        if (!project) {
          console.error(`Project not found: "${opts.project}". Create it with: octonote project create <name>`);
          process.exit(1);
        }
        projectId = project.id;
      }

      const note = await container.noteRepository.createNote(noteTitle, {
        folderId: opts.folder || null,
        projectId,
        type,
        storageFmt: fmt,
      });

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
