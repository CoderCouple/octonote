import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { executeTool } from '../tools/executor';

describe('Tool Executor', () => {
  let tmpDir: string;
  let container: Container;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function setup(): Container {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-tools-'));
    container = createContainer(tmpDir);
    return container;
  }

  // ── create_note ───────────────────────────────────────

  describe('create_note', () => {
    it('creates a note with blocks and tags', () => {
      const c = setup();
      const result = executeTool(c, 'create_note', {
        title: 'Test Note',
        blocks: [
          { type: 'heading', content: 'Hello', meta: { level: 1 } },
          { type: 'paragraph', content: 'World' },
        ],
        tags: ['demo', 'test'],
      });

      expect(result.success).toBe(true);
      const data = result.data as { noteId: string; title: string };
      expect(data.title).toBe('Test Note');

      // Verify in DB
      const note = c.noteRepository.getNote(data.noteId);
      expect(note).toBeDefined();
      expect(note!.blocks).toHaveLength(2);
      expect(note!.tags).toHaveLength(2);
    });

    it('creates a note in a folder', () => {
      const c = setup();
      const folder = c.noteRepository.createFolder('Projects');
      const result = executeTool(c, 'create_note', {
        title: 'Project Note',
        blocks: [{ type: 'paragraph', content: 'In a folder' }],
        folderId: folder.id,
      });

      expect(result.success).toBe(true);
      const data = result.data as { noteId: string };
      const note = c.noteRepository.getNote(data.noteId);
      expect(note!.folderId).toBe(folder.id);
    });
  });

  // ── append_blocks ─────────────────────────────────────

  describe('append_blocks', () => {
    it('appends blocks to an existing note', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Existing');
      c.noteRepository.createBlock({
        noteId: note.id, type: 'paragraph', content: 'Original',
        meta: {}, position: 0, parentId: null,
      });

      const result = executeTool(c, 'append_blocks', {
        noteId: note.id,
        blocks: [{ type: 'paragraph', content: 'Appended' }],
      });

      expect(result.success).toBe(true);
      const blocks = c.noteRepository.getBlocksByNote(note.id);
      expect(blocks).toHaveLength(2);
      expect(blocks[1].content).toBe('Appended');
      expect(blocks[1].position).toBe(1);
    });

    it('resolves note by title', () => {
      const c = setup();
      c.noteRepository.createNote('Find Me');

      const result = executeTool(c, 'append_blocks', {
        noteId: 'Find Me',
        blocks: [{ type: 'paragraph', content: 'Found' }],
      });

      expect(result.success).toBe(true);
    });

    it('returns error for missing note', () => {
      const c = setup();
      const result = executeTool(c, 'append_blocks', {
        noteId: 'nonexistent',
        blocks: [{ type: 'paragraph', content: 'test' }],
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ── replace_blocks ────────────────────────────────────

  describe('replace_blocks', () => {
    it('replaces all blocks in a note', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Rewrite Me');
      c.noteRepository.createBlock({
        noteId: note.id, type: 'paragraph', content: 'Old content',
        meta: {}, position: 0, parentId: null,
      });

      const result = executeTool(c, 'replace_blocks', {
        noteId: note.id,
        blocks: [
          { type: 'heading', content: 'New Title', meta: { level: 1 } },
          { type: 'paragraph', content: 'New content' },
        ],
      });

      expect(result.success).toBe(true);
      const blocks = c.noteRepository.getBlocksByNote(note.id);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('heading');
      expect(blocks[1].content).toBe('New content');
    });
  });

  // ── tag_note ──────────────────────────────────────────

  describe('tag_note', () => {
    it('adds tags to a note', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Tag Me');

      const result = executeTool(c, 'tag_note', {
        noteId: note.id,
        tags: ['important', 'urgent'],
      });

      expect(result.success).toBe(true);
      const tags = c.noteRepository.getNoteTags(note.id);
      expect(tags).toHaveLength(2);
      expect(tags.map(t => t.name).sort()).toEqual(['important', 'urgent']);
    });
  });

  // ── rename_note ───────────────────────────────────────

  describe('rename_note', () => {
    it('renames a note', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Old Name');

      const result = executeTool(c, 'rename_note', {
        noteId: note.id,
        newTitle: 'New Name',
      });

      expect(result.success).toBe(true);
      const updated = c.noteRepository.getNote(note.id);
      expect(updated!.title).toBe('New Name');
    });
  });

  // ── delete_blocks ─────────────────────────────────────

  describe('delete_blocks', () => {
    it('deletes specific blocks and reorders', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Block Delete');
      const b1 = c.noteRepository.createBlock({
        noteId: note.id, type: 'paragraph', content: 'First',
        meta: {}, position: 0, parentId: null,
      });
      const b2 = c.noteRepository.createBlock({
        noteId: note.id, type: 'paragraph', content: 'Second',
        meta: {}, position: 1, parentId: null,
      });
      const b3 = c.noteRepository.createBlock({
        noteId: note.id, type: 'paragraph', content: 'Third',
        meta: {}, position: 2, parentId: null,
      });

      const result = executeTool(c, 'delete_blocks', {
        noteId: note.id,
        blockIds: [b2.id],
      });

      expect(result.success).toBe(true);
      const blocks = c.noteRepository.getBlocksByNote(note.id);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toBe('First');
      expect(blocks[1].content).toBe('Third');
    });
  });

  // ── search_notes ──────────────────────────────────────

  describe('search_notes', () => {
    it('searches notes by query', () => {
      const c = setup();
      const note = c.noteRepository.createNote('TypeScript Guide');
      c.noteRepository.createBlock({
        noteId: note.id, type: 'paragraph', content: 'TypeScript is a typed superset of JavaScript',
        meta: {}, position: 0, parentId: null,
      });

      // Index the note
      const fullNote = c.noteRepository.getNote(note.id)!;
      c.searchEngine.indexNote(fullNote);

      const result = executeTool(c, 'search_notes', { query: 'TypeScript' });

      expect(result.success).toBe(true);
      const data = result.data as any[];
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].title).toBe('TypeScript Guide');
    });

    it('returns empty for no matches', () => {
      const c = setup();
      const result = executeTool(c, 'search_notes', { query: 'nonexistent' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ── get_note ──────────────────────────────────────────

  describe('get_note', () => {
    it('gets a note by ID', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Get Me');
      c.noteRepository.createBlock({
        noteId: note.id, type: 'paragraph', content: 'Hello',
        meta: {}, position: 0, parentId: null,
      });
      c.noteRepository.addTagToNote(note.id, 'test');

      const result = executeTool(c, 'get_note', { noteId: note.id });

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.title).toBe('Get Me');
      expect(data.blocks).toHaveLength(1);
      expect(data.tags).toEqual(['test']);
    });

    it('gets a note by title', () => {
      const c = setup();
      c.noteRepository.createNote('Find By Title');

      const result = executeTool(c, 'get_note', { noteId: 'Find By Title' });
      expect(result.success).toBe(true);
      expect((result.data as any).title).toBe('Find By Title');
    });

    it('returns error for missing note', () => {
      const c = setup();
      const result = executeTool(c, 'get_note', { noteId: 'nope' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ── list_tags ─────────────────────────────────────────

  describe('list_tags', () => {
    it('lists all tags', () => {
      const c = setup();
      const note = c.noteRepository.createNote('Tagged');
      c.noteRepository.addTagToNote(note.id, 'alpha');
      c.noteRepository.addTagToNote(note.id, 'beta');

      const result = executeTool(c, 'list_tags', {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['alpha', 'beta']);
    });

    it('returns empty array when no tags', () => {
      const c = setup();
      const result = executeTool(c, 'list_tags', {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ── list_folders ──────────────────────────────────────

  describe('list_folders', () => {
    it('lists all folders', () => {
      const c = setup();
      c.noteRepository.createFolder('Work');
      c.noteRepository.createFolder('Personal');

      const result = executeTool(c, 'list_folders', {});
      expect(result.success).toBe(true);
      const data = result.data as any[];
      expect(data).toHaveLength(2);
      expect(data.map((f: any) => f.name).sort()).toEqual(['Personal', 'Work']);
    });
  });

  // ── Unknown tool ──────────────────────────────────────

  describe('unknown tool', () => {
    it('returns error for unknown tool', () => {
      const c = setup();
      const result = executeTool(c, 'nonexistent', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });
  });
});
