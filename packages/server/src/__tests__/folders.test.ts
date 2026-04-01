import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

describe('Folders API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-folders-'));
    container = createContainer(tmpDir);
    const srv = createServer(container);
    app = srv.app;
  });

  afterEach(() => {
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
    const folder = container.noteRepository.createFolder('Old Name');
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
    const folder = container.noteRepository.createFolder('To Delete');
    const res = await request(app).delete(`/api/folders/${folder.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const check = container.noteRepository.getFolder(folder.id);
    expect(check).toBeUndefined();
  });

  it('DELETE /api/folders/:id returns 404 for missing', async () => {
    const res = await request(app).delete('/api/folders/nonexistent');
    expect(res.status).toBe(404);
  });
});
