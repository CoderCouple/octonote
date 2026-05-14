import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('Folders API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-folders-'));
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

  it('GET /api/folders returns empty initially', async () => {
    const res = await request(app).get('/api/folders');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/folders creates a folder', async () => {
    const res = await request(app)
      .post('/api/folders')
      .send({ name: 'Projects' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Projects');
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/folders requires name', async () => {
    const res = await request(app)
      .post('/api/folders')
      .send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /api/folders/:id renames folder', async () => {
    const folder = await container.noteRepository.createFolder('Old Name');
    const res = await request(app)
      .patch(`/api/folders/${folder.id}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('PATCH /api/folders/:id returns 404 for missing', async () => {
    const res = await request(app)
      .patch('/api/folders/nonexistent')
      .send({ name: 'New' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/folders/:id deletes folder', async () => {
    const folder = await container.noteRepository.createFolder('To Delete');
    const res = await request(app).delete(`/api/folders/${folder.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const check = await container.noteRepository.getFolder(folder.id);
    expect(check).toBeUndefined();
  });

  it('DELETE /api/folders/:id returns 404 for missing', async () => {
    const res = await request(app).delete('/api/folders/nonexistent');
    expect(res.status).toBe(404);
  });
});
