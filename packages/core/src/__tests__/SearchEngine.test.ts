import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SearchEngine } from '../engine/SearchEngine';
import { Note, BlockType } from '../models/types';

describe('SearchEngine', () => {
  let engine: SearchEngine;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-search-'));
    engine = new SearchEngine(path.join(tmpDir, 'search.idx'));
  });

  function makeNote(id: string, title: string, content: string = '', tags: string[] = []): Note {
    return {
      id,
      title,
      folderId: null,
      storageFmt: 'json',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [{ id: 'b1', noteId: id, type: BlockType.Paragraph, content, meta: {}, position: 0, parentId: null }],
      tags: tags.map((name, i) => ({ id: `t${i}`, name })),
    };
  }

  it('indexes and searches notes', () => {
    engine.indexNote(makeNote('1', 'Getting Started Guide', 'Welcome to the app'));
    engine.indexNote(makeNote('2', 'API Reference', 'REST endpoints'));

    const results = engine.search('getting started');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('1');
  });

  it('returns empty for no matches', () => {
    engine.indexNote(makeNote('1', 'Hello World'));
    const results = engine.search('xyznonexistent');
    expect(results.length).toBe(0);
  });

  it('removes notes from index', () => {
    engine.indexNote(makeNote('1', 'To Remove'));
    engine.removeNote('1');
    const results = engine.search('remove');
    expect(results.length).toBe(0);
  });

  it('updates existing documents', () => {
    engine.indexNote(makeNote('1', 'Old Title'));
    engine.indexNote(makeNote('1', 'New Title'));
    const results = engine.search('New Title');
    expect(results.length).toBe(1);
  });

  it('provides autocomplete suggestions', () => {
    engine.indexNote(makeNote('1', 'JavaScript Guide'));
    engine.indexNote(makeNote('2', 'Java Reference'));
    const suggestions = engine.autocomplete('java');
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('rebuilds index from scratch', () => {
    engine.indexNote(makeNote('1', 'Old Note'));
    engine.rebuildIndex([
      makeNote('2', 'Fresh Note'),
      makeNote('3', 'Another Note'),
    ]);
    expect(engine.search('old').length).toBe(0);
    expect(engine.search('fresh').length).toBe(1);
  });

  it('persists and reloads index', () => {
    engine.indexNote(makeNote('1', 'Persistent Note'));
    const indexPath = path.join(tmpDir, 'search.idx');

    // Create a new engine that loads from the same path
    const engine2 = new SearchEngine(indexPath);
    const results = engine2.search('persistent');
    expect(results.length).toBe(1);
  });
});
