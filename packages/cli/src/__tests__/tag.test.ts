import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerTagCommand } from '../commands/tag.js';

describe('octo tag', () => {
  let container: Container;
  let program: Command;

  beforeEach(async () => {
    container = await createTestContainer();
    program = new Command();
    program.exitOverride();
    registerTagCommand(program, container);
  });

  afterEach(async () => {
    await container.close();
  });

  it('adds a tag to a note', async () => {
    const note = await container.noteRepository.createNote('Tag Test');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'tag', 'Tag Test', 'work']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Added');
    expect(output).toContain('work');

    const tags = await container.noteRepository.getNoteTags(note.id);
    expect(tags.some(t => t.name === 'work')).toBe(true);
  });

  it('lists tags on a note', async () => {
    const note = await container.noteRepository.createNote('List Tags');
    await container.noteRepository.addTagToNote(note.id, 'alpha');
    await container.noteRepository.addTagToNote(note.id, 'beta');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'tag', 'List Tags', '--list']);
    });

    const output = lines.join('\n');
    expect(output).toContain('alpha');
    expect(output).toContain('beta');
  });

  it('removes a tag', async () => {
    const note = await container.noteRepository.createNote('Remove Tag');
    await container.noteRepository.addTagToNote(note.id, 'obsolete');

    const lines = await captureOutput(async () => {
      await program.parseAsync(['node', 'test', 'tag', 'Remove Tag', 'obsolete', '--remove']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Removed');

    const tags = await container.noteRepository.getNoteTags(note.id);
    expect(tags.length).toBe(0);
  });
});
