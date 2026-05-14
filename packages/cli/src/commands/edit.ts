import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import React from 'react';
import { render } from 'ink';
import { resolveNote } from '../utils/resolveNote.js';
import { Editor } from '../tui/Editor.js';

export function registerEditCommand(program: Command, container: Container): void {
  program
    .command('edit <titleOrId>')
    .description('Edit a note in the TUI editor')
    .action(async (titleOrId: string) => {
      const note = await resolveNote(container, titleOrId);

      const { waitUntilExit } = render(
        React.createElement(Editor, { container, note })
      );
      await waitUntilExit();
    });
}
