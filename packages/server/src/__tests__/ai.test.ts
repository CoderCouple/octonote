import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

// Mock the AI modules
vi.mock('@octonote/ai', () => {
  const mockRun = vi.fn();
  return {
    AiService: vi.fn().mockImplementation(() => ({
      run: mockRun,
      resetConversation: vi.fn(),
    })),
    resolveApiKey: vi.fn().mockReturnValue('sk-test'),
    __mockRun: mockRun,
  };
});

import { __mockRun } from '@octonote/ai';
const mockRun = __mockRun as any;

describe('AI API', () => {
  let tmpDir: string;
  let container: Container;
  let app: any;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-ai-'));
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
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await container.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('POST /api/ai returns AI result', async () => {
    mockRun.mockResolvedValueOnce({
      response: 'Done!',
      toolCalls: [],
      affectedNotes: [],
    });

    const res = await request(app)
      .post('/api/ai')
      .send({ prompt: 'Create a note about cats' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Done!');
  });

  it('POST /api/ai requires prompt', async () => {
    const res = await request(app)
      .post('/api/ai')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/stream returns SSE', async () => {
    mockRun.mockImplementationOnce(async (_prompt: string, opts: any) => {
      if (opts.onStream) {
        opts.onStream('Hello ');
        opts.onStream('world!');
      }
      return {
        response: 'Hello world!',
        toolCalls: [],
        affectedNotes: [],
      };
    });

    const res = await request(app)
      .post('/api/ai/stream')
      .send({ prompt: 'Say hello' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data:');
    expect(res.text).toContain('"type":"done"');
  });
});
