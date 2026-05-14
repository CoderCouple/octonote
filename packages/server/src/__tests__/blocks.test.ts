import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('Blocks API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;
  let noteId: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-blocks-'));
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
    const note = await container.noteRepository.createNote('Block Test');
    noteId = note.id;
  });

  afterEach(async () => {
    await container.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('POST /api/notes/:id/blocks appends blocks', async () => {
    const res = await request(app)
      .post(`/api/notes/${noteId}/blocks`)
      .send({
        blocks: [
          { type: 'paragraph', content: 'First' },
          { type: 'heading', content: 'Second' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].content).toBe('First');
    expect(res.body[1].content).toBe('Second');
  });

  it('POST /api/notes/:id/blocks requires blocks array', async () => {
    const res = await request(app)
      .post(`/api/notes/${noteId}/blocks`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('PUT /api/notes/:id/blocks replaces all blocks', async () => {
    // Create initial blocks
    await container.noteRepository.createBlock({
      noteId,
      type: 'paragraph' as any,
      content: 'Old',
      meta: {},
      position: 0,
      parentId: null,
    });

    const res = await request(app)
      .put(`/api/notes/${noteId}/blocks`)
      .send({
        blocks: [
          { type: 'heading', content: 'Replaced' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBe('Replaced');

    // Verify old block is gone
    const blocks = await container.noteRepository.getBlocksByNote(noteId);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('Replaced');
  });

  it('PATCH /api/notes/:id/blocks/:blockId updates a block', async () => {
    const block = await container.noteRepository.createBlock({
      noteId,
      type: 'paragraph' as any,
      content: 'Original',
      meta: {},
      position: 0,
      parentId: null,
    });

    const res = await request(app)
      .patch(`/api/notes/${noteId}/blocks/${block.id}`)
      .send({ content: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Updated');
  });

  it('DELETE /api/notes/:id/blocks/:blockId deletes and reorders', async () => {
    const b1 = await container.noteRepository.createBlock({
      noteId,
      type: 'paragraph' as any,
      content: 'First',
      meta: {},
      position: 0,
      parentId: null,
    });
    const b2 = await container.noteRepository.createBlock({
      noteId,
      type: 'paragraph' as any,
      content: 'Second',
      meta: {},
      position: 1,
      parentId: null,
    });

    const res = await request(app)
      .delete(`/api/notes/${noteId}/blocks/${b1.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const blocks = await container.noteRepository.getBlocksByNote(noteId);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe(b2.id);
    expect(blocks[0].position).toBe(0);
  });
});
