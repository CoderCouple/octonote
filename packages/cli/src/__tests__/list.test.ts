import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerListCommand } from '../commands/list.js';

describe('octo list', () => {
  let container: Container;
  let program: Command;

  beforeEach(async () => {
    container = await createTestContainer();
    program = new Command();
    program.exitOverride();
    registerListCommand(program, container);
  });

  afterEach(async () => {
    await container.close();
  });

  it('lists notes', async () => {
    await container.noteRepository.createNote('Note A');
    await container.noteRepository.createNote('Note B');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'list']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Note A');
    expect(output).toContain('Note B');
    expect(output).toContain('2 note(s)');
  });

  it('outputs JSON when --output json', async () => {
    await container.noteRepository.createNote('JSON Note');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'list', '--output', 'json']);
    });

    const parsed = JSON.parse(lines.join('\n'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe('JSON Note');
  });

  it('shows empty message when no notes', async () => {
    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'list']);
    });

    const output = lines.join('\n');
    expect(output).toContain('No notes found');
  });

  it('filters by tag', async () => {
    const note = await container.noteRepository.createNote('Tagged Note');
    await container.noteRepository.addTagToNote(note.id, 'work');
    await container.noteRepository.createNote('Untagged');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'list', '--tag', 'work']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Tagged Note');
    expect(output).not.toContain('Untagged');
  });
});
