import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from '../routes/helpers';

describe('Route Helpers', () => {
  let tmpDir: string;
  let container: Container;

  function setup(): Container {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-helpers-'));
    container = createContainer(tmpDir);
    return container;
  }

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('resolveNote', () => {
    it('resolves by ID', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Test Note');
      const resolved = resolveNote(c, note.id);
      expect(resolved.id).toBe(note.id);
      expect(resolved.title).toBe('Test Note');
    });

    it('resolves by title', () => {
      const c = setup();
      c.noteRepository.createNote('My Title');
      const resolved = resolveNote(c, 'My Title');
      expect(resolved.title).toBe('My Title');
    });

    it('throws 404 for missing note', () => {
      const c = setup();
      expect(() => resolveNote(c, 'nonexistent')).toThrow('Note not found');
      try {
        resolveNote(c, 'nonexistent');
      } catch (err: any) {
        expect(err.status).toBe(404);
      }
    });
  });

  describe('fullSave', () => {
    it('saves vault file, reindexes, syncs links, and broadcasts', () => {
      const c = setup();
      const broadcaster = new Broadcaster();
      const broadcastSpy = vi.spyOn(broadcaster, 'broadcast');

      const note = c.noteRepository.createNote('Save Test');
      c.noteRepository.createBlock({
        noteId: note.id,
        type: 'paragraph' as any,
        content: 'Hello world',
        meta: {},
        position: 0,
        parentId: null,
      });

      fullSave(c, note.id, broadcaster);

      expect(broadcastSpy).toHaveBeenCalledWith('note:updated', {
        noteId: note.id,
        title: 'Save Test',
      });
    });

    it('does nothing for missing note', () => {
      const c = setup();
      const broadcaster = new Broadcaster();
      const broadcastSpy = vi.spyOn(broadcaster, 'broadcast');

      fullSave(c, 'nonexistent-id', broadcaster);

      expect(broadcastSpy).not.toHaveBeenCalled();
    });
  });
});
