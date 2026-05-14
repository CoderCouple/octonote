import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer } from '../index';
import type { Container } from '../index';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('Container', () => {
  let tmpDir: string;
  let container: Container | undefined;

  afterEach(async () => {
    if (container) {
      await container.close();
      container = undefined;
    }
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('bootstraps all services', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-container-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);

    expect(container.pool).toBeDefined();
    expect(container.noteRepository).toBeDefined();
    expect(container.blockEngine).toBeDefined();
    expect(container.searchEngine).toBeDefined();
    expect(container.linkGraph).toBeDefined();
    expect(container.vaultManager).toBeDefined();
    expect(container.dailyNoteService).toBeDefined();
  });

  it('creates vault directory structure', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-container-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'vault'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'config.json'))).toBe(true);
  });

  it('services work together end-to-end', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-container-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);
    const c = container;

    // Clean tables
    await c.pool.query('DELETE FROM daily_notes');
    await c.pool.query('DELETE FROM links');
    await c.pool.query('DELETE FROM note_tags');
    await c.pool.query('DELETE FROM blocks');
    await c.pool.query('DELETE FROM notes');
    await c.pool.query('DELETE FROM tags');
    await c.pool.query('DELETE FROM folders');

    // Create a note
    const note = await c.noteRepository.createNote('Test Note');
    await c.noteRepository.addTagToNote(note.id, 'demo');

    // Add blocks
    await c.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph',
      content: 'Hello [[Other Note]]',
      meta: {},
      position: 0,
      parentId: null,
    });

    // Index for search
    const fullNote = (await c.noteRepository.getNote(note.id))!;
    c.searchEngine.indexNote(fullNote);

    // Search
    const results = c.searchEngine.search('test');
    expect(results.length).toBe(1);

    // Save to vault
    c.vaultManager.saveNote(fullNote, fullNote.blocks!);

    // Daily note
    const daily = await c.dailyNoteService.getOrCreateToday();
    expect(daily).toBeDefined();
  });
});
