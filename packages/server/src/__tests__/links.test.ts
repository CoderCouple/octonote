import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('Links API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-links-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);
    await container.pool.query('DELETE FROM daily_notes');
    await container.pool.query('DELETE FROM links');
    await container.pool.query('DELETE FROM note_tags');
    await container.pool.query('DELETE FROM blocks');
    await container.pool.query('DELETE FROM notes');
    await container.pool.query('DELETE FROM tags');
    await container.pool.query('DELETE FROM folders');
    const srv = createServer(container);
    app = srv.app;
  });

  afterEach(async () => {
    await container.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('GET /api/notes/:id/links returns forward and backlinks', async () => {
    const noteA = await container.noteRepository.createNote('Note A');
    const noteB = await container.noteRepository.createNote('Note B');

    // Create a wikilink from A -> B
    const block = await container.noteRepository.createBlock({
      noteId: noteA.id,
      type: 'paragraph' as any,
      content: 'See [[Note B]]',
      meta: {},
      position: 0,
      parentId: null,
    });
    await container.linkGraph.syncLinks(noteA.id, [block]);

    const resA = await request(app).get(`/api/notes/${noteA.id}/links`);
    expect(resA.status).toBe(200);
    expect(resA.body.forward).toHaveLength(1);
    expect(resA.body.backlinks).toHaveLength(0);

    const resB = await request(app).get(`/api/notes/${noteB.id}/links`);
    expect(resB.status).toBe(200);
    expect(resB.body.forward).toHaveLength(0);
    expect(resB.body.backlinks).toHaveLength(1);
  });

  it('GET /api/graph returns nodes and edges', async () => {
    const noteA = await container.noteRepository.createNote('Graph A');
    const noteB = await container.noteRepository.createNote('Graph B');

    const block = await container.noteRepository.createBlock({
      noteId: noteA.id,
      type: 'paragraph' as any,
      content: 'Link to [[Graph B]]',
      meta: {},
      position: 0,
      parentId: null,
    });
    await container.linkGraph.syncLinks(noteA.id, [block]);

    const res = await request(app).get('/api/graph');
    expect(res.status).toBe(200);
    expect(res.body.nodes).toHaveLength(2);
    expect(res.body.edges).toHaveLength(1);
    expect(res.body.edges[0].source).toBe(noteA.id);
    expect(res.body.edges[0].target).toBe(noteB.id);
  });
});
