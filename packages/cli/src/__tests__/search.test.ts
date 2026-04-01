import { describe, it, expect, beforeEach } from 'vitest';
import type { Container, BlockType } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerSearchCommand } from '../commands/search.js';

describe('octo search', () => {
  let container: Container;
  let program: Command;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerSearchCommand(program, container);
  });

  it('finds notes by title', async () => {
    const note = container.noteRepository.createNote('TypeScript Guide');
    container.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph' as BlockType,
      content: 'Learn TypeScript basics',
      meta: {},
      position: 0,
      parentId: null,
    });

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'search', 'TypeScript']);
    });

    const output = lines.join('\n');
    expect(output).toContain('TypeScript Guide');
  });

  it('outputs JSON results', async () => {
    container.noteRepository.createNote('Search Test');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'search', 'Search', '--output', 'json']);
    });

    const parsed = JSON.parse(lines.join('\n'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe('Search Test');
  });

  it('shows empty message for no results', async () => {
    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'search', 'zzzznonexistent']);
    });

    const output = lines.join('\n');
    expect(output).toContain('No results found');
  });
});
