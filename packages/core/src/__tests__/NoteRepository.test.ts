import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../db/schema';
import { NoteRepository } from '../db/NoteRepository';

describe('NoteRepository', () => {
  let db: Database.Database;
  let repo: NoteRepository;

  beforeEach(() => {
    db = initDatabase(':memory:');
    repo = new NoteRepository(db);
  });

  // ── Notes ──────────────────────────────────

  it('creates and retrieves a note', () => {
    const note = repo.createNote('Test Note');
    expect(note.title).toBe('Test Note');
    expect(note.id).toBeTruthy();

    const fetched = repo.getNote(note.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe('Test Note');
    expect(fetched!.blocks).toEqual([]);
    expect(fetched!.tags).toEqual([]);
  });

  it('finds note by title', () => {
    repo.createNote('Unique Title');
    const found = repo.getNoteByTitle('Unique Title');
    expect(found).toBeDefined();
    expect(found!.title).toBe('Unique Title');
  });

  it('updates a note', () => {
    const note = repo.createNote('Old Title');
    repo.updateNote(note.id, { title: 'New Title' });
    const fetched = repo.getNote(note.id);
    expect(fetched!.title).toBe('New Title');
  });

  it('deletes a note', () => {
    const note = repo.createNote('To Delete');
    repo.deleteNote(note.id);
    expect(repo.getNote(note.id)).toBeUndefined();
  });

  it('lists notes with folder filter', () => {
    const folder = repo.createFolder('MyFolder');
    repo.createNote('In folder', folder.id);
    repo.createNote('No folder');

    const all = repo.listNotes();
    expect(all.length).toBe(2);

    const filtered = repo.listNotes({ folderId: folder.id });
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('In folder');
  });

  it('lists notes with tag filter', () => {
    const note = repo.createNote('Tagged');
    repo.addTagToNote(note.id, 'important');
    repo.createNote('Untagged');

    const filtered = repo.listNotes({ tag: 'important' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Tagged');
  });

  // ── Blocks ─────────────────────────────────

  it('creates and retrieves blocks', () => {
    const note = repo.createNote('With Blocks');
    repo.createBlock({ noteId: note.id, type: 'paragraph', content: 'Hello', meta: {}, position: 0, parentId: null });
    repo.createBlock({ noteId: note.id, type: 'heading', content: 'Title', meta: { level: 1 }, position: 1, parentId: null });

    const blocks = repo.getBlocksByNote(note.id);
    expect(blocks.length).toBe(2);
    expect(blocks[0].content).toBe('Hello');
    expect(blocks[1].meta).toEqual({ level: 1 });
  });

  it('reorders blocks', () => {
    const note = repo.createNote('Reorder');
    const b1 = repo.createBlock({ noteId: note.id, type: 'paragraph', content: 'First', meta: {}, position: 0, parentId: null });
    const b2 = repo.createBlock({ noteId: note.id, type: 'paragraph', content: 'Second', meta: {}, position: 1, parentId: null });

    repo.reorderBlocks(note.id, [b2.id, b1.id]);
    const blocks = repo.getBlocksByNote(note.id);
    expect(blocks[0].content).toBe('Second');
    expect(blocks[1].content).toBe('First');
  });

  // ── Folders ────────────────────────────────

  it('creates and lists folders', () => {
    repo.createFolder('Folder A');
    repo.createFolder('Folder B');
    const folders = repo.listFolders();
    expect(folders.length).toBe(2);
  });

  it('deletes a folder', () => {
    const folder = repo.createFolder('To Delete');
    repo.deleteFolder(folder.id);
    expect(repo.getFolder(folder.id)).toBeUndefined();
  });

  // ── Tags ───────────────────────────────────

  it('manages tags on notes', () => {
    const note = repo.createNote('Tagged Note');
    const tag = repo.addTagToNote(note.id, 'work');
    expect(tag.name).toBe('work');

    const tags = repo.getNoteTags(note.id);
    expect(tags.length).toBe(1);
    expect(tags[0].name).toBe('work');

    repo.removeTagFromNote(note.id, tag.id);
    expect(repo.getNoteTags(note.id).length).toBe(0);
  });

  it('reuses existing tags', () => {
    const note1 = repo.createNote('Note 1');
    const note2 = repo.createNote('Note 2');
    repo.addTagToNote(note1.id, 'shared');
    repo.addTagToNote(note2.id, 'shared');

    expect(repo.listTags().length).toBe(1);
  });

  // ── Links ──────────────────────────────────

  it('creates and queries links', () => {
    const source = repo.createNote('Source');
    const target = repo.createNote('Target');
    repo.createLink(source.id, target.id);

    const forward = repo.getLinksFromNote(source.id);
    expect(forward.length).toBe(1);
    expect(forward[0].targetNoteId).toBe(target.id);

    const back = repo.getBacklinks(target.id);
    expect(back.length).toBe(1);
    expect(back[0].sourceNoteId).toBe(source.id);
  });

  // ── Daily Notes ────────────────────────────

  it('creates and retrieves daily notes', () => {
    const note = repo.createNote('Daily: 2024-01-15');
    repo.createDailyNote('2024-01-15', note.id);

    const daily = repo.getDailyNote('2024-01-15');
    expect(daily).toBeDefined();
    expect(daily!.noteId).toBe(note.id);
  });

  it('calculates streak', () => {
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const note = repo.createNote(`Daily: ${dateStr}`);
      repo.createDailyNote(dateStr, note.id);
    }
    expect(repo.getStreak()).toBe(3);
  });
});
