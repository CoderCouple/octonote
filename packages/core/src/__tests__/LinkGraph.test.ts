import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../db/schema';
import { NoteRepository } from '../db/NoteRepository';
import { LinkGraph } from '../engine/LinkGraph';
import { BlockType } from '../models/types';

describe('LinkGraph', () => {
  let db: Database.Database;
  let repo: NoteRepository;
  let graph: LinkGraph;

  beforeEach(() => {
    db = initDatabase(':memory:');
    repo = new NoteRepository(db);
    graph = new LinkGraph(repo);
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
    it('creates links for wikilinks pointing to existing notes', () => {
      const source = repo.createNote('Source');
      const target = repo.createNote('Target');

      const blocks = [{
        id: 'b1',
        noteId: source.id,
        type: BlockType.Paragraph,
        content: 'Link to [[Target]]',
        meta: {},
        position: 0,
        parentId: null,
      }];

      graph.syncLinks(source.id, blocks);

      const forwardLinks = graph.getForwardLinks(source.id);
      expect(forwardLinks.length).toBe(1);
      expect(forwardLinks[0].targetNoteId).toBe(target.id);
    });

    it('removes old links on re-sync', () => {
      const source = repo.createNote('Source');
      repo.createNote('Target');

      graph.syncLinks(source.id, [{
        id: 'b1', noteId: source.id, type: BlockType.Paragraph,
        content: '[[Target]]', meta: {}, position: 0, parentId: null,
      }]);
      expect(graph.getForwardLinks(source.id).length).toBe(1);

      // Re-sync with no wikilinks
      graph.syncLinks(source.id, [{
        id: 'b1', noteId: source.id, type: BlockType.Paragraph,
        content: 'No links now', meta: {}, position: 0, parentId: null,
      }]);
      expect(graph.getForwardLinks(source.id).length).toBe(0);
    });
  });

  describe('backlinks', () => {
    it('finds backlinks', () => {
      const note1 = repo.createNote('Note 1');
      const note2 = repo.createNote('Note 2');

      graph.syncLinks(note1.id, [{
        id: 'b1', noteId: note1.id, type: BlockType.Paragraph,
        content: '[[Note 2]]', meta: {}, position: 0, parentId: null,
      }]);

      const backlinks = graph.getBacklinks(note2.id);
      expect(backlinks.length).toBe(1);
      expect(backlinks[0].sourceNoteId).toBe(note1.id);
    });
  });

  describe('orphans', () => {
    it('detects orphan notes', () => {
      const note1 = repo.createNote('Connected 1');
      const note2 = repo.createNote('Connected 2');
      repo.createNote('Orphan');

      repo.createLink(note1.id, note2.id);

      const orphans = graph.getOrphans();
      expect(orphans.length).toBe(1);
      expect(orphans[0].title).toBe('Orphan');
    });
  });

  describe('getGraphData', () => {
    it('returns nodes and edges', () => {
      const n1 = repo.createNote('A');
      const n2 = repo.createNote('B');
      repo.createLink(n1.id, n2.id);

      const data = graph.getGraphData();
      expect(data.nodes.length).toBe(2);
      expect(data.edges.length).toBe(1);
      expect(data.edges[0].source).toBe(n1.id);
      expect(data.edges[0].target).toBe(n2.id);
    });
  });
});
