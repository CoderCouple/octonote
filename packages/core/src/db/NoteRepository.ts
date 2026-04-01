import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  Note,
  Block,
  Folder,
  Tag,
  Link,
  DailyNote,
  StorageFormat,
} from '../models/types';

export class NoteRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // ── Notes ──────────────────────────────────────────────

  createNote(title: string, folderId?: string | null, storageFmt: StorageFormat = 'json'): Note {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO notes (id, title, folder_id, storage_fmt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, title, folderId ?? null, storageFmt, now, now);
    return { id, title, folderId: folderId ?? null, storageFmt, createdAt: now, updatedAt: now };
  }

  getNote(id: string): Note | undefined {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    const note = this.mapNote(row);
    note.blocks = this.getBlocksByNote(id);
    note.tags = this.getNoteTags(id);
    return note;
  }

  getNoteByTitle(title: string): Note | undefined {
    const row = this.db.prepare('SELECT * FROM notes WHERE title = ?').get(title) as any;
    if (!row) return undefined;
    const note = this.mapNote(row);
    note.blocks = this.getBlocksByNote(note.id);
    note.tags = this.getNoteTags(note.id);
    return note;
  }

  updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'storageFmt'>>): void {
    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.folderId !== undefined) { fields.push('folder_id = ?'); values.push(updates.folderId); }
    if (updates.storageFmt !== undefined) { fields.push('storage_fmt = ?'); values.push(updates.storageFmt); }

    values.push(id);
    this.db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteNote(id: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  }

  listNotes(options?: { folderId?: string; tag?: string }): Note[] {
    let sql = 'SELECT DISTINCT n.* FROM notes n';
    const params: unknown[] = [];

    if (options?.tag) {
      sql += ' JOIN note_tags nt ON n.id = nt.note_id JOIN tags t ON nt.tag_id = t.id';
      sql += ' WHERE t.name = ?';
      params.push(options.tag);
      if (options.folderId) {
        sql += ' AND n.folder_id = ?';
        params.push(options.folderId);
      }
    } else if (options?.folderId) {
      sql += ' WHERE n.folder_id = ?';
      params.push(options.folderId);
    }

    sql += ' ORDER BY n.updated_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapNote(r));
  }

  // ── Blocks ─────────────────────────────────────────────

  createBlock(block: Omit<Block, 'id'>): Block {
    const id = uuidv4();
    this.db.prepare(
      'INSERT INTO blocks (id, note_id, type, content, meta, position, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, block.noteId, block.type, block.content, JSON.stringify(block.meta), block.position, block.parentId);
    return { id, ...block };
  }

  getBlocksByNote(noteId: string): Block[] {
    const rows = this.db.prepare(
      'SELECT * FROM blocks WHERE note_id = ? ORDER BY position ASC'
    ).all(noteId) as any[];
    return rows.map(r => this.mapBlock(r));
  }

  updateBlock(id: string, updates: Partial<Pick<Block, 'type' | 'content' | 'meta' | 'position' | 'parentId'>>): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
    if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
    if (updates.meta !== undefined) { fields.push('meta = ?'); values.push(JSON.stringify(updates.meta)); }
    if (updates.position !== undefined) { fields.push('position = ?'); values.push(updates.position); }
    if (updates.parentId !== undefined) { fields.push('parent_id = ?'); values.push(updates.parentId); }

    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE blocks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    // Update parent note's updated_at
    const block = this.db.prepare('SELECT note_id FROM blocks WHERE id = ?').get(id) as any;
    if (block) {
      this.db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), block.note_id);
    }
  }

  deleteBlock(id: string): void {
    this.db.prepare('DELETE FROM blocks WHERE id = ?').run(id);
  }

  reorderBlocks(noteId: string, blockIds: string[]): void {
    const stmt = this.db.prepare('UPDATE blocks SET position = ? WHERE id = ? AND note_id = ?');
    const txn = this.db.transaction(() => {
      blockIds.forEach((blockId, i) => stmt.run(i, blockId, noteId));
    });
    txn();
  }

  // ── Folders ────────────────────────────────────────────

  createFolder(name: string, parentId?: string | null): Folder {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO folders (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(id, name, parentId ?? null, now);
    return { id, name, parentId: parentId ?? null, createdAt: now };
  }

  getFolder(id: string): Folder | undefined {
    const row = this.db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as any;
    return row ? this.mapFolder(row) : undefined;
  }

  listFolders(): Folder[] {
    const rows = this.db.prepare('SELECT * FROM folders ORDER BY name').all() as any[];
    return rows.map(r => this.mapFolder(r));
  }

  deleteFolder(id: string): void {
    this.db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  }

  // ── Tags ───────────────────────────────────────────────

  createTag(name: string): Tag {
    const id = uuidv4();
    this.db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(id, name);
    return { id, name };
  }

  getTag(id: string): Tag | undefined {
    const row = this.db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as any;
    return row ? { id: row.id, name: row.name } : undefined;
  }

  getTagByName(name: string): Tag | undefined {
    const row = this.db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as any;
    return row ? { id: row.id, name: row.name } : undefined;
  }

  listTags(): Tag[] {
    const rows = this.db.prepare('SELECT * FROM tags ORDER BY name').all() as any[];
    return rows.map(r => ({ id: r.id, name: r.name }));
  }

  addTagToNote(noteId: string, tagName: string): Tag {
    let tag = this.getTagByName(tagName);
    if (!tag) tag = this.createTag(tagName);
    this.db.prepare(
      'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)'
    ).run(noteId, tag.id);
    return tag;
  }

  removeTagFromNote(noteId: string, tagId: string): void {
    this.db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?').run(noteId, tagId);
  }

  getNoteTags(noteId: string): Tag[] {
    const rows = this.db.prepare(
      'SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?'
    ).all(noteId) as any[];
    return rows.map(r => ({ id: r.id, name: r.name }));
  }

  // ── Links ──────────────────────────────────────────────

  createLink(sourceNoteId: string, targetNoteId: string, sourceBlockId?: string | null, alias?: string | null): Link {
    const id = uuidv4();
    this.db.prepare(
      'INSERT INTO links (id, source_note_id, target_note_id, source_block_id, alias) VALUES (?, ?, ?, ?, ?)'
    ).run(id, sourceNoteId, targetNoteId, sourceBlockId ?? null, alias ?? null);
    return { id, sourceNoteId, targetNoteId, sourceBlockId: sourceBlockId ?? null, alias: alias ?? null };
  }

  getLinksFromNote(noteId: string): Link[] {
    const rows = this.db.prepare('SELECT * FROM links WHERE source_note_id = ?').all(noteId) as any[];
    return rows.map(r => this.mapLink(r));
  }

  getBacklinks(noteId: string): Link[] {
    const rows = this.db.prepare('SELECT * FROM links WHERE target_note_id = ?').all(noteId) as any[];
    return rows.map(r => this.mapLink(r));
  }

  deleteLink(id: string): void {
    this.db.prepare('DELETE FROM links WHERE id = ?').run(id);
  }

  deleteLinksFromNote(noteId: string): void {
    this.db.prepare('DELETE FROM links WHERE source_note_id = ?').run(noteId);
  }

  // ── Daily Notes ────────────────────────────────────────

  getDailyNote(date: string): DailyNote | undefined {
    const row = this.db.prepare('SELECT * FROM daily_notes WHERE date = ?').get(date) as any;
    return row ? { date: row.date, noteId: row.note_id } : undefined;
  }

  createDailyNote(date: string, noteId: string): DailyNote {
    this.db.prepare('INSERT INTO daily_notes (date, note_id) VALUES (?, ?)').run(date, noteId);
    return { date, noteId };
  }

  getStreak(): number {
    const rows = this.db.prepare(
      'SELECT date FROM daily_notes ORDER BY date DESC'
    ).all() as any[];

    if (rows.length === 0) return 0;

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(rows[0].date);
    lastDate.setHours(0, 0, 0, 0);

    // Streak must include today or yesterday
    const diffFromToday = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    if (diffFromToday > 1) return 0;

    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].date);
      const curr = new Date(rows[i].date);
      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);
      const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // ── Mappers ────────────────────────────────────────────

  private mapNote(row: any): Note {
    return {
      id: row.id,
      title: row.title,
      folderId: row.folder_id,
      storageFmt: row.storage_fmt as StorageFormat,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapBlock(row: any): Block {
    return {
      id: row.id,
      noteId: row.note_id,
      type: row.type,
      content: row.content,
      meta: JSON.parse(row.meta),
      position: row.position,
      parentId: row.parent_id,
    };
  }

  private mapFolder(row: any): Folder {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      createdAt: row.created_at,
    };
  }

  private mapLink(row: any): Link {
    return {
      id: row.id,
      sourceNoteId: row.source_note_id,
      targetNoteId: row.target_note_id,
      sourceBlockId: row.source_block_id,
      alias: row.alias,
    };
  }
}
