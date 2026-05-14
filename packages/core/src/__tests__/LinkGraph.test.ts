import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import { initDatabase } from '../db/schema';
import { NoteRepository } from '../db/NoteRepository';
import { LinkGraph } from '../engine/LinkGraph';
import { BlockType } from '../models/types';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('LinkGraph', () => {
  let pool: Pool;
  let repo: NoteRepository;
  let graph: LinkGraph;

  beforeEach(async () => {
    pool = await initDatabase(TEST_DATABASE_URL);
    await pool.query('DELETE FROM daily_notes');
    await pool.query('DELETE FROM links');
    await pool.query('DELETE FROM note_tags');
    await pool.query('DELETE FROM blocks');
    await pool.query('DELETE FROM notes');
    await pool.query('DELETE FROM tags');
    await pool.query('DELETE FROM folders');
    repo = new NoteRepository(pool);
    graph = new LinkGraph(repo);
  });

  afterEach(async () => {
    await pool.end();
  });

  describe('extractWikilinks', () => {
    it('extracts simple wikilinks', () => {
      const links = graph.extractWikilinks('Check out [[My Note]] and [[Other]].');
      expect(links).toEqual([
        { target: 'My Note', alias: null },
        { target: 'Other', alias: null },
      ]);
    });

    it('extracts aliased wikilinks', () => {
      const links = graph.extractWikilinks('See [[Page Title|custom text]].');
      expect(links).toEqual([
        { target: 'Page Title', alias: 'custom text' },
      ]);
    });

    it('returns empty for no wikilinks', () => {
      expect(graph.extractWikilinks('No links here.')).toEqual([]);
    });
  });

  describe('syncLinks', () => {
    it('creates links for wikilinks pointing to existing notes', async () => {
      const source = await repo.createNote('Source');
      const target = await repo.createNote('Target');

      const blocks = [{
        id: 'b1',
        noteId: source.id,
        type: BlockType.Paragraph,
        content: 'Link to [[Target]]',
        meta: {},
        position: 0,
        parentId: null,
      }];

      await graph.syncLinks(source.id, blocks);

      const forwardLinks = await graph.getForwardLinks(source.id);
      expect(forwardLinks.length).toBe(1);
      expect(forwardLinks[0].targetNoteId).toBe(target.id);
    });

    it('removes old links on re-sync', async () => {
      const source = await repo.createNote('Source');
      await repo.createNote('Target');

      await graph.syncLinks(source.id, [{
        id: 'b1', noteId: source.id, type: BlockType.Paragraph,
        content: '[[Target]]', meta: {}, position: 0, parentId: null,
      }]);
      expect((await graph.getForwardLinks(source.id)).length).toBe(1);

      // Re-sync with no wikilinks
      await graph.syncLinks(source.id, [{
        id: 'b1', noteId: source.id, type: BlockType.Paragraph,
        content: 'No links now', meta: {}, position: 0, parentId: null,
      }]);
      expect((await graph.getForwardLinks(source.id)).length).toBe(0);
    });
  });

  describe('backlinks', () => {
    it('finds backlinks', async () => {
      const note1 = await repo.createNote('Note 1');
      const note2 = await repo.createNote('Note 2');

      await graph.syncLinks(note1.id, [{
        id: 'b1', noteId: note1.id, type: BlockType.Paragraph,
        content: '[[Note 2]]', meta: {}, position: 0, parentId: null,
      }]);

      const backlinks = await graph.getBacklinks(note2.id);
      expect(backlinks.length).toBe(1);
      expect(backlinks[0].sourceNoteId).toBe(note1.id);
    });
  });

  describe('orphans', () => {
    it('detects orphan notes', async () => {
      const note1 = await repo.createNote('Connected 1');
      const note2 = await repo.createNote('Connected 2');
      await repo.createNote('Orphan');

      await repo.createLink(note1.id, note2.id);

      const orphans = await graph.getOrphans();
      expect(orphans.length).toBe(1);
      expect(orphans[0].title).toBe('Orphan');
    });
  });

  describe('getGraphData', () => {
    it('returns nodes and edges', async () => {
      const n1 = await repo.createNote('A');
      const n2 = await repo.createNote('B');
      await repo.createLink(n1.id, n2.id);

      const data = await graph.getGraphData();
      expect(data.nodes.length).toBe(2);
      expect(data.edges.length).toBe(1);
      expect(data.edges[0].source).toBe(n1.id);
      expect(data.edges[0].target).toBe(n2.id);
    });
  });
});
