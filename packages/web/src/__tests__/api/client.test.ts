import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note, Block, Tag, SearchResult } from '@/types';
import { BlockType } from '@/types';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Helper: create a fake Response that resolves with JSON
function jsonResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

// Import the api after fetch is mocked so fetchJson uses our mock
// (dynamic import isn't needed because globalThis.fetch is assigned above)
import { api } from '@/api/client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeNote: Note = {
  id: 'note-1',
  title: 'Test Note',
  folderId: null,
  storageFmt: 'json',
  createdAt: '2026-03-30T00:00:00.000Z',
  updatedAt: '2026-03-30T00:00:00.000Z',
  blocks: [],
  tags: [],
};

const fakeBlock: Block = {
  id: 'block-1',
  noteId: 'note-1',
  type: BlockType.Paragraph,
  content: 'Hello world',
  meta: {},
  position: 0,
  parentId: null,
};

const fakeTag: Tag = { id: 'tag-1', name: 'test-tag' };

const fakeSearchResult: SearchResult = {
  id: 'note-1',
  title: 'Test Note',
  score: 1.5,
  snippet: '...matching text...',
  tags: ['test-tag'],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ---- notes -------------------------------------------------------------

  describe('notes', () => {
    it('list() calls GET /api/notes', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([fakeNote]));

      const result = await api.notes.list();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notes');
      expect(init.method).toBeUndefined(); // GET is the default
      expect(result).toEqual([fakeNote]);
    });

    it('get(id) calls GET /api/notes/:id', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(fakeNote));

      const result = await api.notes.get('note-1');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notes/note-1');
      expect(result).toEqual(fakeNote);
    });

    it('create() calls POST /api/notes with body', async () => {
      const createData = { title: 'New Note', folderId: 'folder-1' };
      mockFetch.mockResolvedValueOnce(jsonResponse(fakeNote));

      const result = await api.notes.create(createData);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notes');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual(createData);
      expect(result).toEqual(fakeNote);
    });

    it('update() calls PATCH /api/notes/:id with body', async () => {
      const updateData = { title: 'Updated Title' };
      mockFetch.mockResolvedValueOnce(jsonResponse(fakeNote));

      const result = await api.notes.update('note-1', updateData);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notes/note-1');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual(updateData);
      expect(result).toEqual(fakeNote);
    });

    it('delete() calls DELETE /api/notes/:id', async () => {
      const deleteResponse = { deleted: true, noteId: 'note-1' };
      mockFetch.mockResolvedValueOnce(jsonResponse(deleteResponse));

      const result = await api.notes.delete('note-1');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notes/note-1');
      expect(init.method).toBe('DELETE');
      expect(result).toEqual(deleteResponse);
    });
  });

  // ---- search ------------------------------------------------------------

  describe('search', () => {
    it('query() calls GET /api/search with query params', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([fakeSearchResult]));

      const result = await api.search.query('hello');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      // The URL should contain q=hello and limit=10 (default)
      expect(url).toContain('/api/search');
      expect(url).toContain('q=hello');
      expect(url).toContain('limit=10');
      expect(result).toEqual([fakeSearchResult]);
    });
  });

  // ---- tags --------------------------------------------------------------

  describe('tags', () => {
    it('list() calls GET /api/tags', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([fakeTag]));

      const result = await api.tags.list();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tags');
      expect(result).toEqual([fakeTag]);
    });
  });

  // ---- blocks ------------------------------------------------------------

  describe('blocks', () => {
    it('append() calls POST /api/notes/:id/blocks with body', async () => {
      const blockList = [fakeBlock];
      mockFetch.mockResolvedValueOnce(jsonResponse(blockList));

      const result = await api.blocks.append('note-1', blockList);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notes/note-1/blocks');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({ blocks: blockList });
      expect(result).toEqual(blockList);
    });
  });
});
