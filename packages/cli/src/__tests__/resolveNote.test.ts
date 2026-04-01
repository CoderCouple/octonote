import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer } from './helpers.js';
import { resolveNote } from '../utils/resolveNote.js';

describe('resolveNote', () => {
  let container: Container;

  beforeEach(() => {
    container = createTestContainer();
  });

  it('resolves note by ID', () => {
    const note = container.noteRepository.createNote('Test Note');
    const resolved = resolveNote(container, note.id);
    expect(resolved.id).toBe(note.id);
    expect(resolved.title).toBe('Test Note');
  });

  it('resolves note by title', () => {
    const note = container.noteRepository.createNote('My Note');
    const resolved = resolveNote(container, 'My Note');
    expect(resolved.id).toBe(note.id);
  });

  it('exits with error if not found', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as any);
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => resolveNote(container, 'nonexistent')).toThrow('process.exit');
    expect(mockError).toHaveBeenCalledWith('Note not found: "nonexistent"');

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
