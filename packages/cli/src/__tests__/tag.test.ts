import { describe, it, expect, beforeEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerTagCommand } from '../commands/tag.js';

describe('octo tag', () => {
  let container: Container;
  let program: Command;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerTagCommand(program, container);
  });

  it('adds a tag to a note', async () => {
    const note = container.noteRepository.createNote('Tag Test');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'tag', 'Tag Test', 'work']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Added');
    expect(output).toContain('work');

    const tags = container.noteRepository.getNoteTags(note.id);
    expect(tags.some(t => t.name === 'work')).toBe(true);
  });

  it('lists tags on a note', async () => {
    const note = container.noteRepository.createNote('List Tags');
    container.noteRepository.addTagToNote(note.id, 'alpha');
    container.noteRepository.addTagToNote(note.id, 'beta');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'tag', 'List Tags', '--list']);
    });

    const output = lines.join('\n');
    expect(output).toContain('alpha');
    expect(output).toContain('beta');
  });

  it('removes a tag', async () => {
    const note = container.noteRepository.createNote('Remove Tag');
    container.noteRepository.addTagToNote(note.id, 'obsolete');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'tag', 'Remove Tag', 'obsolete', '--remove']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Removed');

    const tags = container.noteRepository.getNoteTags(note.id);
    expect(tags.length).toBe(0);
  });
});
