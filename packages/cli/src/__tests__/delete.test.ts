import { describe, it, expect, beforeEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerDeleteCommand } from '../commands/delete.js';

describe('octo delete', () => {
  let container: Container;
  let program: Command;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerDeleteCommand(program, container);
  });

  it('deletes a note with -y flag', async () => {
    const note = container.noteRepository.createNote('Delete Me');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'delete', 'Delete Me', '-y']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Deleted');

    const found = container.noteRepository.getNote(note.id);
    expect(found).toBeUndefined();
  });
});
