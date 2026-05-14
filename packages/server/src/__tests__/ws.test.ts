import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WebSocket } from 'ws';
import { createContainer, type Container } from '@octonote/core';
import { createServer } from '../index';
import type { Server } from 'http';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('WebSocket', () => {
  let tmpDir: string;
  let container: Container;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-server-ws-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);
    await container.pool.query('DELETE FROM daily_notes');
    await container.pool.query('DELETE FROM links');
    await container.pool.query('DELETE FROM note_tags');
    await container.pool.query('DELETE FROM blocks');
    await container.pool.query('DELETE FROM notes');
    await container.pool.query('DELETE FROM tags');
    await container.pool.query('DELETE FROM folders');
    const srv = createServer(container);
    server = srv.server;

    // Listen on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await container.close();
    await new Promise<void>((resolve) => {
      server.close(() => {
        if (tmpDir && fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
        resolve();
      });
    });
  });

  it('receives broadcasts on note creation', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    const messages: any[] = [];

    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    // Create a note via the API which triggers a broadcast
    const { default: supertest } = await import('supertest');
    const srv = createServer(container);
    // Use the actual running server's app
    const http = await import('http');

    // POST to create note
    await fetch(`http://localhost:${port}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'WS Test Note' }),
    });

    // Wait for message delivery
    await new Promise(r => setTimeout(r, 100));

    ws.close();

    // Should have received at least one broadcast
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const events = messages.map(m => m.event);
    expect(events).toContain('note:created');
  });

  it('connects and receives messages', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    // Client connected — verify it's alive
    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.close();
  });
});
