import { describe, it, expect, beforeEach } from 'vitest';
import type { Container, BlockType } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerViewCommand } from '../commands/view.js';

describe('octo view', () => {
  let container: Container;
  let program: Command;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerViewCommand(program, container);
  });

  it('displays a note in terminal format', async () => {
    const note = container.noteRepository.createNote('Hello World');
    container.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph' as BlockType,
      content: 'This is a test',
      meta: {},
      position: 0,
      parentId: null,
    });

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'view', 'Hello World']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Hello World');
    expect(output).toContain('This is a test');
  });

  it('outputs JSON when --output json', async () => {
    const note = container.noteRepository.createNote('JSON Test');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'view', 'JSON Test', '--output', 'json']);
    });

    const parsed = JSON.parse(lines.join('\n'));
    expect(parsed.title).toBe('JSON Test');
    expect(parsed.id).toBe(note.id);
  });
});
