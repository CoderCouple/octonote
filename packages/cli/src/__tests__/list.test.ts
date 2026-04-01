import { describe, it, expect, beforeEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerListCommand } from '../commands/list.js';

describe('octo list', () => {
  let container: Container;
  let program: Command;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerListCommand(program, container);
  });

  it('lists notes', async () => {
    container.noteRepository.createNote('Note A');
    container.noteRepository.createNote('Note B');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'list']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Note A');
    expect(output).toContain('Note B');
    expect(output).toContain('2 note(s)');
  });

  it('outputs JSON when --output json', async () => {
    container.noteRepository.createNote('JSON Note');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'list', '--output', 'json']);
    });

    const parsed = JSON.parse(lines.join('\n'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe('JSON Note');
  });

  it('shows empty message when no notes', async () => {
    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'list']);
    });

    const output = lines.join('\n');
    expect(output).toContain('No notes found');
  });

  it('filters by tag', async () => {
    const note = container.noteRepository.createNote('Tagged Note');
    container.noteRepository.addTagToNote(note.id, 'work');
    container.noteRepository.createNote('Untagged');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'list', '--tag', 'work']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Tagged Note');
    expect(output).not.toContain('Untagged');
  });
});
