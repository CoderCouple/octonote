import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  Note,
  NoteType,
  Block,
  Folder,
  Project,
  Tag,
  Link,
  DailyNote,
  StorageFormat,
} from '../models/types';

export class NoteRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ── Notes ──────────────────────────────────────────────

  async createNote(
    title: string,
    options?: {
      folderId?: string | null;
      storageFmt?: StorageFormat;
      projectId?: string | null;
      type?: NoteType;
      transcript?: string | null;
    }
  ): Promise<Note> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const folderId = options?.folderId ?? null;
    const projectId = options?.projectId ?? null;
    const storageFmt = options?.storageFmt ?? 'json';
    const type = options?.type ?? 'note';
    const transcript = options?.transcript ?? null;
    await this.pool.query(
      'INSERT INTO notes (id, title, folder_id, project_id, type, storage_fmt, transcript, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, title, folderId, projectId, type, storageFmt, transcript, now, now]
    );
    return { id, title, folderId, projectId, type, storageFmt, transcript, createdAt: now, updatedAt: now };
  }

  async getNote(id: string): Promise<Note | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (rows.length === 0) return undefined;
    const note = this.mapNote(rows[0]);
    note.blocks = await this.getBlocksByNote(id);
    note.tags = await this.getNoteTags(id);
    return note;
  }

  async getNoteByTitle(title: string): Promise<Note | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM notes WHERE title = $1', [title]);
    if (rows.length === 0) return undefined;
    const note = this.mapNote(rows[0]);
    note.blocks = await this.getBlocksByNote(note.id);
    note.tags = await this.getNoteTags(note.id);
    return note;
  }

  async updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'projectId' | 'type' | 'storageFmt' | 'transcript'>>): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = $1'];
    const values: unknown[] = [now];
    let paramIdx = 2;

    if (updates.title !== undefined) { fields.push(`title = $${paramIdx}`); values.push(updates.title); paramIdx++; }
    if (updates.folderId !== undefined) { fields.push(`folder_id = $${paramIdx}`); values.push(updates.folderId); paramIdx++; }
    if (updates.projectId !== undefined) { fields.push(`project_id = $${paramIdx}`); values.push(updates.projectId); paramIdx++; }
    if (updates.type !== undefined) { fields.push(`type = $${paramIdx}`); values.push(updates.type); paramIdx++; }
    if (updates.storageFmt !== undefined) { fields.push(`storage_fmt = $${paramIdx}`); values.push(updates.storageFmt); paramIdx++; }
    if (updates.transcript !== undefined) { fields.push(`transcript = $${paramIdx}`); values.push(updates.transcript); paramIdx++; }

    values.push(id);
    await this.pool.query(`UPDATE notes SET ${fields.join(', ')} WHERE id = $${paramIdx}`, values);
  }

  async deleteNote(id: string): Promise<void> {
    await this.pool.query('DELETE FROM notes WHERE id = $1', [id]);
  }

  async listNotes(options?: { folderId?: string; projectId?: string; type?: NoteType; tag?: string }): Promise<Note[]> {
    let sql = 'SELECT DISTINCT n.* FROM notes n';
    const params: unknown[] = [];
    const where: string[] = [];
    let paramIdx = 1;

    if (options?.tag) {
      sql += ' JOIN note_tags nt ON n.id = nt.note_id JOIN tags t ON nt.tag_id = t.id';
      where.push(`t.name = $${paramIdx}`);
      params.push(options.tag);
      paramIdx++;
    }
    if (options?.folderId) {
      where.push(`n.folder_id = $${paramIdx}`);
      params.push(options.folderId);
      paramIdx++;
    }
    if (options?.projectId) {
      where.push(`n.project_id = $${paramIdx}`);
      params.push(options.projectId);
      paramIdx++;
    }
    if (options?.type) {
      where.push(`n.type = $${paramIdx}`);
      params.push(options.type);
      paramIdx++;
    }

    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY n.updated_at DESC';
    const { rows } = await this.pool.query(sql, params);
    return rows.map((r: any) => this.mapNote(r));
  }

  // ── Blocks ─────────────────────────────────────────────

  async createBlock(block: Omit<Block, 'id'>): Promise<Block> {
    const id = uuidv4();
    await this.pool.query(
      'INSERT INTO blocks (id, note_id, type, content, meta, position, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, block.noteId, block.type, block.content, JSON.stringify(block.meta), block.position, block.parentId]
    );
    return { id, ...block };
  }

  async getBlocksByNote(noteId: string): Promise<Block[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM blocks WHERE note_id = $1 ORDER BY position ASC',
      [noteId]
    );
    return rows.map((r: any) => this.mapBlock(r));
  }

  async updateBlock(id: string, updates: Partial<Pick<Block, 'type' | 'content' | 'meta' | 'position' | 'parentId'>>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (updates.type !== undefined) { fields.push(`type = $${paramIdx}`); values.push(updates.type); paramIdx++; }
    if (updates.content !== undefined) { fields.push(`content = $${paramIdx}`); values.push(updates.content); paramIdx++; }
    if (updates.meta !== undefined) { fields.push(`meta = $${paramIdx}`); values.push(JSON.stringify(updates.meta)); paramIdx++; }
    if (updates.position !== undefined) { fields.push(`position = $${paramIdx}`); values.push(updates.position); paramIdx++; }
    if (updates.parentId !== undefined) { fields.push(`parent_id = $${paramIdx}`); values.push(updates.parentId); paramIdx++; }

    if (fields.length === 0) return;
    values.push(id);
    await this.pool.query(`UPDATE blocks SET ${fields.join(', ')} WHERE id = $${paramIdx}`, values);

    // Update parent note's updated_at
    const { rows } = await this.pool.query('SELECT note_id FROM blocks WHERE id = $1', [id]);
    if (rows.length > 0) {
      await this.pool.query('UPDATE notes SET updated_at = $1 WHERE id = $2', [new Date().toISOString(), rows[0].note_id]);
    }
  }

  async deleteBlock(id: string): Promise<void> {
    await this.pool.query('DELETE FROM blocks WHERE id = $1', [id]);
  }

  async reorderBlocks(noteId: string, blockIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < blockIds.length; i++) {
        await client.query('UPDATE blocks SET position = $1 WHERE id = $2 AND note_id = $3', [i, blockIds[i], noteId]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Folders ────────────────────────────────────────────

  async createFolder(name: string, parentId?: string | null): Promise<Folder> {
    const id = uuidv4();
    const now = new Date().toISOString();
    await this.pool.query(
      'INSERT INTO folders (id, name, parent_id, created_at) VALUES ($1, $2, $3, $4)',
      [id, name, parentId ?? null, now]
    );
    return { id, name, parentId: parentId ?? null, createdAt: now };
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM folders WHERE id = $1', [id]);
    return rows.length > 0 ? this.mapFolder(rows[0]) : undefined;
  }

  async getFolderByName(name: string, parentId?: string | null): Promise<Folder | undefined> {
    const { rows } = await this.pool.query(
      'SELECT * FROM folders WHERE name = $1 AND parent_id IS NOT DISTINCT FROM $2',
      [name, parentId ?? null]
    );
    return rows.length > 0 ? this.mapFolder(rows[0]) : undefined;
  }

  /** Get an existing folder by name+parent, or create it if absent. */
  async ensureFolder(name: string, parentId?: string | null): Promise<Folder> {
    const existing = await this.getFolderByName(name, parentId ?? null);
    return existing ?? this.createFolder(name, parentId ?? null);
  }

  async listFolders(): Promise<Folder[]> {
    const { rows } = await this.pool.query('SELECT * FROM folders ORDER BY name');
    return rows.map((r: any) => this.mapFolder(r));
  }

  async deleteFolder(id: string): Promise<void> {
    await this.pool.query('DELETE FROM folders WHERE id = $1', [id]);
  }

  // ── Projects ───────────────────────────────────────────

  async createProject(
    name: string,
    options?: { slug?: string; description?: string | null; repo?: string | null; status?: string }
  ): Promise<Project> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const slug = options?.slug ?? slugify(name);
    const description = options?.description ?? null;
    const repo = options?.repo ?? null;
    const status = options?.status ?? 'active';
    await this.pool.query(
      'INSERT INTO projects (id, name, slug, description, repo, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, name, slug, description, repo, status, now, now]
    );
    return { id, name, slug, description, repo, status, createdAt: now, updatedAt: now };
  }

  async getProject(id: string): Promise<Project | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return rows.length > 0 ? this.mapProject(rows[0]) : undefined;
  }

  async getProjectBySlug(slug: string): Promise<Project | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM projects WHERE slug = $1', [slug]);
    return rows.length > 0 ? this.mapProject(rows[0]) : undefined;
  }

  async getProjectByRepo(repo: string): Promise<Project | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM projects WHERE repo = $1', [repo]);
    return rows.length > 0 ? this.mapProject(rows[0]) : undefined;
  }

  async listProjects(): Promise<Project[]> {
    const { rows } = await this.pool.query('SELECT * FROM projects ORDER BY name');
    return rows.map((r: any) => this.mapProject(r));
  }

  async updateProject(
    id: string,
    updates: Partial<Pick<Project, 'name' | 'slug' | 'description' | 'repo' | 'status'>>
  ): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = $1'];
    const values: unknown[] = [now];
    let paramIdx = 2;

    if (updates.name !== undefined) { fields.push(`name = $${paramIdx}`); values.push(updates.name); paramIdx++; }
    if (updates.slug !== undefined) { fields.push(`slug = $${paramIdx}`); values.push(updates.slug); paramIdx++; }
    if (updates.description !== undefined) { fields.push(`description = $${paramIdx}`); values.push(updates.description); paramIdx++; }
    if (updates.repo !== undefined) { fields.push(`repo = $${paramIdx}`); values.push(updates.repo); paramIdx++; }
    if (updates.status !== undefined) { fields.push(`status = $${paramIdx}`); values.push(updates.status); paramIdx++; }

    values.push(id);
    await this.pool.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIdx}`, values);
  }

  async deleteProject(id: string): Promise<void> {
    await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
  }

  /** Get an existing project by its git repo slug, or create one if absent. */
  async ensureProject(repo: string): Promise<Project> {
    const existing = await this.getProjectByRepo(repo);
    if (existing) return existing;
    const name = repo.split('/').pop() || repo;
    return this.createProject(name, { slug: slugify(repo), repo });
  }

  // ── Tags ───────────────────────────────────────────────

  async createTag(name: string): Promise<Tag> {
    const id = uuidv4();
    await this.pool.query('INSERT INTO tags (id, name) VALUES ($1, $2)', [id, name]);
    return { id, name };
  }

  async getTag(id: string): Promise<Tag | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM tags WHERE id = $1', [id]);
    return rows.length > 0 ? { id: rows[0].id, name: rows[0].name } : undefined;
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM tags WHERE name = $1', [name]);
    return rows.length > 0 ? { id: rows[0].id, name: rows[0].name } : undefined;
  }

  async listTags(): Promise<Tag[]> {
    const { rows } = await this.pool.query('SELECT * FROM tags ORDER BY name');
    return rows.map((r: any) => ({ id: r.id, name: r.name }));
  }

  async addTagToNote(noteId: string, tagName: string): Promise<Tag> {
    let tag = await this.getTagByName(tagName);
    if (!tag) tag = await this.createTag(tagName);
    await this.pool.query(
      'INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [noteId, tag.id]
    );
    return tag;
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await this.pool.query('DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2', [noteId, tagId]);
  }

  async getNoteTags(noteId: string): Promise<Tag[]> {
    const { rows } = await this.pool.query(
      'SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = $1',
      [noteId]
    );
    return rows.map((r: any) => ({ id: r.id, name: r.name }));
  }

  // ── Links ──────────────────────────────────────────────

  async createLink(sourceNoteId: string, targetNoteId: string, sourceBlockId?: string | null, alias?: string | null): Promise<Link> {
    const id = uuidv4();
    await this.pool.query(
      'INSERT INTO links (id, source_note_id, target_note_id, source_block_id, alias) VALUES ($1, $2, $3, $4, $5)',
      [id, sourceNoteId, targetNoteId, sourceBlockId ?? null, alias ?? null]
    );
    return { id, sourceNoteId, targetNoteId, sourceBlockId: sourceBlockId ?? null, alias: alias ?? null };
  }

  async getLinksFromNote(noteId: string): Promise<Link[]> {
    const { rows } = await this.pool.query('SELECT * FROM links WHERE source_note_id = $1', [noteId]);
    return rows.map((r: any) => this.mapLink(r));
  }

  async getBacklinks(noteId: string): Promise<Link[]> {
    const { rows } = await this.pool.query('SELECT * FROM links WHERE target_note_id = $1', [noteId]);
    return rows.map((r: any) => this.mapLink(r));
  }

  async deleteLink(id: string): Promise<void> {
    await this.pool.query('DELETE FROM links WHERE id = $1', [id]);
  }

  async deleteLinksFromNote(noteId: string): Promise<void> {
    await this.pool.query('DELETE FROM links WHERE source_note_id = $1', [noteId]);
  }

  // ── Daily Notes ────────────────────────────────────────

  async getDailyNote(date: string): Promise<DailyNote | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM daily_notes WHERE date = $1', [date]);
    return rows.length > 0 ? { date: rows[0].date, noteId: rows[0].note_id } : undefined;
  }

  async createDailyNote(date: string, noteId: string): Promise<DailyNote> {
    await this.pool.query('INSERT INTO daily_notes (date, note_id) VALUES ($1, $2)', [date, noteId]);
    return { date, noteId };
  }

  async getStreak(): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT date FROM daily_notes ORDER BY date DESC'
    );

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
      projectId: row.project_id ?? null,
      type: (row.type ?? 'note') as NoteType,
      storageFmt: row.storage_fmt as StorageFormat,
      transcript: row.transcript ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      repo: row.repo ?? null,
      status: row.status,
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

/** Lowercase, hyphenated, url-safe slug (e.g. `CoderCouple/octonote` → `codercouple-octonote`). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
