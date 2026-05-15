import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import { initDatabase } from '../db/schema';
import { NoteRepository } from '../db/NoteRepository';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('NoteRepository', () => {
  let pool: Pool;
  let repo: NoteRepository;

  beforeEach(async () => {
    pool = await initDatabase(TEST_DATABASE_URL);
    // Clean tables in dependency order
    await pool.query('DELETE FROM daily_notes');
    await pool.query('DELETE FROM links');
    await pool.query('DELETE FROM note_tags');
    await pool.query('DELETE FROM blocks');
    await pool.query('DELETE FROM notes');
    await pool.query('DELETE FROM tags');
    await pool.query('DELETE FROM folders');
    repo = new NoteRepository(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  // ── Notes ──────────────────────────────────

  it('creates and retrieves a note', async () => {
    const note = await repo.createNote('Test Note');
    expect(note.title).toBe('Test Note');
    expect(note.id).toBeTruthy();

    const fetched = await repo.getNote(note.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe('Test Note');
    expect(fetched!.blocks).toEqual([]);
    expect(fetched!.tags).toEqual([]);
  });

  it('finds note by title', async () => {
    await repo.createNote('Unique Title');
    const found = await repo.getNoteByTitle('Unique Title');
    expect(found).toBeDefined();
    expect(found!.title).toBe('Unique Title');
  });

  it('updates a note', async () => {
    const note = await repo.createNote('Old Title');
    await repo.updateNote(note.id, { title: 'New Title' });
    const fetched = await repo.getNote(note.id);
    expect(fetched!.title).toBe('New Title');
  });

  it('deletes a note', async () => {
    const note = await repo.createNote('To Delete');
    await repo.deleteNote(note.id);
    expect(await repo.getNote(note.id)).toBeUndefined();
  });

  it('lists notes with folder filter', async () => {
    const folder = await repo.createFolder('MyFolder');
    await repo.createNote('In folder', { folderId: folder.id });
    await repo.createNote('No folder');

    const all = await repo.listNotes();
    expect(all.length).toBe(2);

    const filtered = await repo.listNotes({ folderId: folder.id });
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('In folder');
  });

  it('lists notes with tag filter', async () => {
    const note = await repo.createNote('Tagged');
    await repo.addTagToNote(note.id, 'important');
    await repo.createNote('Untagged');

    const filtered = await repo.listNotes({ tag: 'important' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Tagged');
  });

  // ── Blocks ─────────────────────────────────

  it('creates and retrieves blocks', async () => {
    const note = await repo.createNote('With Blocks');
    await repo.createBlock({ noteId: note.id, type: 'paragraph', content: 'Hello', meta: {}, position: 0, parentId: null });
    await repo.createBlock({ noteId: note.id, type: 'heading', content: 'Title', meta: { level: 1 }, position: 1, parentId: null });

    const blocks = await repo.getBlocksByNote(note.id);
    expect(blocks.length).toBe(2);
    expect(blocks[0].content).toBe('Hello');
    expect(blocks[1].meta).toEqual({ level: 1 });
  });

  it('reorders blocks', async () => {
    const note = await repo.createNote('Reorder');
    const b1 = await repo.createBlock({ noteId: note.id, type: 'paragraph', content: 'First', meta: {}, position: 0, parentId: null });
    const b2 = await repo.createBlock({ noteId: note.id, type: 'paragraph', content: 'Second', meta: {}, position: 1, parentId: null });

    await repo.reorderBlocks(note.id, [b2.id, b1.id]);
    const blocks = await repo.getBlocksByNote(note.id);
    expect(blocks[0].content).toBe('Second');
    expect(blocks[1].content).toBe('First');
  });

  // ── Folders ────────────────────────────────

  it('creates and lists folders', async () => {
    await repo.createFolder('Folder A');
    await repo.createFolder('Folder B');
    const folders = await repo.listFolders();
    expect(folders.length).toBe(2);
  });

  it('deletes a folder', async () => {
    const folder = await repo.createFolder('To Delete');
    await repo.deleteFolder(folder.id);
    expect(await repo.getFolder(folder.id)).toBeUndefined();
  });

  // ── Tags ───────────────────────────────────

  it('manages tags on notes', async () => {
    const note = await repo.createNote('Tagged Note');
    const tag = await repo.addTagToNote(note.id, 'work');
    expect(tag.name).toBe('work');

    const tags = await repo.getNoteTags(note.id);
    expect(tags.length).toBe(1);
    expect(tags[0].name).toBe('work');

    await repo.removeTagFromNote(note.id, tag.id);
    expect((await repo.getNoteTags(note.id)).length).toBe(0);
  });

  it('reuses existing tags', async () => {
    const note1 = await repo.createNote('Note 1');
    const note2 = await repo.createNote('Note 2');
    await repo.addTagToNote(note1.id, 'shared');
    await repo.addTagToNote(note2.id, 'shared');

    expect((await repo.listTags()).length).toBe(1);
  });

  // ── Links ──────────────────────────────────

  it('creates and queries links', async () => {
    const source = await repo.createNote('Source');
    const target = await repo.createNote('Target');
    await repo.createLink(source.id, target.id);

    const forward = await repo.getLinksFromNote(source.id);
    expect(forward.length).toBe(1);
    expect(forward[0].targetNoteId).toBe(target.id);

    const back = await repo.getBacklinks(target.id);
    expect(back.length).toBe(1);
    expect(back[0].sourceNoteId).toBe(source.id);
  });

  // ── Daily Notes ────────────────────────────

  it('creates and retrieves daily notes', async () => {
    const note = await repo.createNote('Daily: 2024-01-15');
    await repo.createDailyNote('2024-01-15', note.id);

    const daily = await repo.getDailyNote('2024-01-15');
    expect(daily).toBeDefined();
    expect(daily!.noteId).toBe(note.id);
  });

  it('calculates streak', async () => {
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const note = await repo.createNote(`Daily: ${dateStr}`);
      await repo.createDailyNote(dateStr, note.id);
    }
    expect(await repo.getStreak()).toBe(3);
  });
});
