import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

describe('Search API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-search-'));
    container = createContainer(tmpDir);
    const srv = createServer(container);
    app = srv.app;
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('GET /api/search requires q parameter', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
  });

  it('GET /api/search returns matching notes', async () => {
    const note = container.noteRepository.createNote('TypeScript Guide');
    container.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph' as any,
      content: 'A guide about TypeScript',
      meta: {},
      position: 0,
      parentId: null,
    });

    container.noteRepository.createNote('Python Guide');

    const res = await request(app).get('/api/search?q=TypeScript');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].title).toBe('TypeScript Guide');
  });

  it('GET /api/search respects limit', async () => {
    container.noteRepository.createNote('Note One');
    container.noteRepository.createNote('Note Two');
    container.noteRepository.createNote('Note Three');

    const res = await request(app).get('/api/search?q=Note&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(2);
  });
});
