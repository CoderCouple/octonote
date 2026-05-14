import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer } from './helpers.js';
import { resolveNote } from '../utils/resolveNote.js';

describe('resolveNote', () => {
  let container: Container;

  beforeEach(async () => {
    container = await createTestContainer();
  });

  afterEach(async () => {
    await container.close();
  });

  it('resolves note by ID', async () => {
    const note = await container.noteRepository.createNote('Test Note');
    const resolved = await resolveNote(container, note.id);
    expect(resolved.id).toBe(note.id);
    expect(resolved.title).toBe('Test Note');
  });

  it('resolves note by title', async () => {
    const note = await container.noteRepository.createNote('My Note');
    const resolved = await resolveNote(container, 'My Note');
    expect(resolved.id).toBe(note.id);
  });

  it('exits with error if not found', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as any);
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(resolveNote(container, 'nonexistent')).rejects.toThrow('process.exit');
    expect(mockError).toHaveBeenCalledWith('Note not found: "nonexistent"');

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
