import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from '../routes/helpers';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('Route Helpers', () => {
  let tmpDir: string;
  let container: Container;

  async function setup(): Promise<Container> {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-helpers-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);
    await container.pool.query('DELETE FROM daily_notes');
    await container.pool.query('DELETE FROM links');
    await container.pool.query('DELETE FROM note_tags');
    await container.pool.query('DELETE FROM blocks');
    await container.pool.query('DELETE FROM notes');
    await container.pool.query('DELETE FROM tags');
    await container.pool.query('DELETE FROM folders');
    return container;
  }

  afterEach(async () => {
    if (container) await container.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('resolveNote', () => {
    it('resolves by ID', async () => {
      const c = await setup();
      const note = await c.noteRepository.createNote('Test Note');
      const resolved = await resolveNote(c, note.id);
      expect(resolved.id).toBe(note.id);
      expect(resolved.title).toBe('Test Note');
    });

    it('resolves by title', async () => {
      const c = await setup();
      await c.noteRepository.createNote('My Title');
      const resolved = await resolveNote(c, 'My Title');
      expect(resolved.title).toBe('My Title');
    });

    it('throws 404 for missing note', async () => {
      const c = await setup();
      await expect(resolveNote(c, 'nonexistent')).rejects.toThrow('Note not found');
      try {
        await resolveNote(c, 'nonexistent');
      } catch (err: any) {
        expect(err.status).toBe(404);
      }
    });
  });

  describe('fullSave', () => {
    it('saves vault file, reindexes, syncs links, and broadcasts', async () => {
      const c = await setup();
      const broadcaster = new Broadcaster();
      const broadcastSpy = vi.spyOn(broadcaster, 'broadcast');

      const note = await c.noteRepository.createNote('Save Test');
      await c.noteRepository.createBlock({
        noteId: note.id,
        type: 'paragraph' as any,
        content: 'Hello world',
        meta: {},
        position: 0,
        parentId: null,
      });

      await fullSave(c, note.id, broadcaster);

      expect(broadcastSpy).toHaveBeenCalledWith('note:updated', {
        noteId: note.id,
        title: 'Save Test',
      });
    });

    it('does nothing for missing note', async () => {
      const c = await setup();
      const broadcaster = new Broadcaster();
      const broadcastSpy = vi.spyOn(broadcaster, 'broadcast');

      await fullSave(c, 'nonexistent-id', broadcaster);

      expect(broadcastSpy).not.toHaveBeenCalled();
    });
  });
});
