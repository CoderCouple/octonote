import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('Notes API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-notes-'));
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

  it('GET /api/notes returns empty array', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/notes creates a note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: 'New Note' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Note');
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/notes requires title', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/notes/:id returns note with blocks', async () => {
    const note = await container.noteRepository.createNote('Detail Note');
    await container.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph' as any,
      content: 'Block content',
      meta: {},
      position: 0,
      parentId: null,
    });

    const res = await request(app).get(`/api/notes/${note.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Detail Note');
    expect(res.body.blocks).toHaveLength(1);
  });

  it('GET /api/notes/:id returns 404 for missing', async () => {
    const res = await request(app).get('/api/notes/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/notes/:id updates title', async () => {
    const note = await container.noteRepository.createNote('Old Title');
    const res = await request(app)
      .patch(`/api/notes/${note.id}`)
      .send({ title: 'New Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Title');
  });

  it('DELETE /api/notes/:id deletes note', async () => {
    const note = await container.noteRepository.createNote('To Delete');
    const res = await request(app).delete(`/api/notes/${note.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    // Verify deleted
    const check = await request(app).get(`/api/notes/${note.id}`);
    expect(check.status).toBe(404);
  });

  it('GET /api/notes?tag= filters by tag', async () => {
    const note = await container.noteRepository.createNote('Tagged Note');
    await container.noteRepository.addTagToNote(note.id, 'work');
    await container.noteRepository.createNote('Untagged');

    const res = await request(app).get('/api/notes?tag=work');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Tagged Note');
  });

  it('GET /api/notes?folder= filters by folder', async () => {
    const folder = await container.noteRepository.createFolder('Projects');
    await container.noteRepository.createNote('In Folder', { folderId: folder.id });
    await container.noteRepository.createNote('No Folder');

    const res = await request(app).get(`/api/notes?folder=${folder.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('In Folder');
  });
});
