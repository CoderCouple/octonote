import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer } from '../index';

describe('Container', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('bootstraps all services', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-container-'));
    const container = createContainer(tmpDir);

    expect(container.db).toBeDefined();
    expect(container.noteRepository).toBeDefined();
    expect(container.blockEngine).toBeDefined();
    expect(container.searchEngine).toBeDefined();
    expect(container.linkGraph).toBeDefined();
    expect(container.vaultManager).toBeDefined();
    expect(container.dailyNoteService).toBeDefined();
  });

  it('creates vault directory structure', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-container-'));
    createContainer(tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'octonote.db'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'vault'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'config.json'))).toBe(true);
  });

  it('services work together end-to-end', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-container-'));
    const c = createContainer(tmpDir);

    // Create a note
    const note = c.noteRepository.createNote('Test Note');
    c.noteRepository.addTagToNote(note.id, 'demo');

    // Add blocks
    c.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph',
      content: 'Hello [[Other Note]]',
      meta: {},
      position: 0,
      parentId: null,
    });

    // Index for search
    const fullNote = c.noteRepository.getNote(note.id)!;
    c.searchEngine.indexNote(fullNote);

    // Search
    const results = c.searchEngine.search('test');
    expect(results.length).toBe(1);

    // Save to vault
    c.vaultManager.saveNote(fullNote, fullNote.blocks!);

    // Daily note
    const daily = c.dailyNoteService.getOrCreateToday();
    expect(daily).toBeDefined();
  });
});
