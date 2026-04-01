import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

describe('Tags API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-tags-'));
    container = createContainer(tmpDir);
    const srv = createServer(container);
    app = srv.app;
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('GET /api/tags returns empty initially', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/tags/notes/:id/tags adds tag to note', async () => {
    const note = container.noteRepository.createNote('Tag Test');
    const res = await request(app)
      .post(`/api/tags/notes/${note.id}/tags`)
      .send({ name: 'important' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('important');
  });

  it('POST /api/tags/notes/:id/tags requires name', async () => {
    const note = container.noteRepository.createNote('Tag Test');
    const res = await request(app)
      .post(`/api/tags/notes/${note.id}/tags`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('DELETE /api/tags/notes/:id/tags/:tagName removes tag', async () => {
    const note = container.noteRepository.createNote('Tag Remove');
    container.noteRepository.addTagToNote(note.id, 'remove-me');

    const res = await request(app)
      .delete(`/api/tags/notes/${note.id}/tags/remove-me`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const tags = container.noteRepository.getNoteTags(note.id);
    expect(tags).toHaveLength(0);
  });

  it('DELETE /api/tags/notes/:id/tags/:tagName returns 404 for missing tag', async () => {
    const note = container.noteRepository.createNote('Tag Remove');
    const res = await request(app)
      .delete(`/api/tags/notes/${note.id}/tags/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('GET /api/tags lists all tags after adding', async () => {
    const note = container.noteRepository.createNote('Tag List');
    container.noteRepository.addTagToNote(note.id, 'alpha');
    container.noteRepository.addTagToNote(note.id, 'beta');

    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const names = res.body.map((t: any) => t.name).sort();
    expect(names).toEqual(['alpha', 'beta']);
  });
});
