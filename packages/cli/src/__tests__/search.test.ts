import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Container, BlockType } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerSearchCommand } from '../commands/search.js';

describe('octo search', () => {
  let container: Container;
  let program: Command;

  beforeEach(async () => {
    container = await createTestContainer();
    program = new Command();
    program.exitOverride();
    registerSearchCommand(program, container);
  });

  afterEach(async () => {
    await container.close();
  });

  it('finds notes by title', async () => {
    const note = await container.noteRepository.createNote('TypeScript Guide');
    await container.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph' as BlockType,
      content: 'Learn TypeScript basics',
      meta: {},
      position: 0,
      parentId: null,
    });

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'search', 'TypeScript']);
    });

    const output = lines.join('\n');
    expect(output).toContain('TypeScript Guide');
  });

  it('outputs JSON results', async () => {
    await container.noteRepository.createNote('Search Test');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'search', 'Search', '--output', 'json']);
    });

    const parsed = JSON.parse(lines.join('\n'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe('Search Test');
  });

  it('shows empty message for no results', async () => {
    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'search', 'zzzznonexistent']);
    });

    const output = lines.join('\n');
    expect(output).toContain('No results found');
  });
});
