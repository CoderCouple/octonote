import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { buildSystemPrompt } from '../context';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('buildSystemPrompt', () => {
  let tmpDir: string;
  let container: Container;

  afterEach(async () => {
    if (container) await container.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  async function setup(): Promise<Container> {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-ctx-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);
    await container.pool.query('DELETE FROM daily_notes');
    await container.pool.query('DELETE FROM links');
    await container.pool.query('DELETE FROM note_tags');
    await container.pool.query('DELETE FROM blocks');
    await container.pool.query('DELETE FROM notes');
    await container.pool.query('DELETE FROM tags');
    await container.pool.query('DELETE FROM folders');
    return container;
  }

  it('handles empty vault', async () => {
    const c = await setup();
    const prompt = await buildSystemPrompt(c);
    expect(prompt).toContain('OctoNote');
    expect(prompt).toContain('(empty vault)');
    expect(prompt).toContain('0 notes');
    expect(prompt).toContain('Block Types Reference');
  });

  it('includes note titles', async () => {
    const c = await setup();
    await c.noteRepository.createNote('My Test Note');
    const prompt = await buildSystemPrompt(c);
    expect(prompt).toContain('My Test Note');
    expect(prompt).toContain('1 total');
  });

  it('includes tags', async () => {
    const c = await setup();
    const note = await c.noteRepository.createNote('Tagged Note');
    await c.noteRepository.addTagToNote(note.id, 'javascript');
    const prompt = await buildSystemPrompt(c);
    expect(prompt).toContain('javascript');
  });

  it('includes folders', async () => {
    const c = await setup();
    await c.noteRepository.createFolder('Projects');
    const prompt = await buildSystemPrompt(c);
    expect(prompt).toContain('Projects');
  });

  it('includes link graph stats', async () => {
    const c = await setup();
    const n1 = await c.noteRepository.createNote('Note A');
    const n2 = await c.noteRepository.createNote('Note B');
    await c.noteRepository.createLink(n1.id, n2.id);
    const prompt = await buildSystemPrompt(c);
    expect(prompt).toContain('2 notes');
    expect(prompt).toContain('1 links');
  });

  it('includes block type reference', async () => {
    const c = await setup();
    const prompt = await buildSystemPrompt(c);
    expect(prompt).toContain('paragraph');
    expect(prompt).toContain('heading');
    expect(prompt).toContain('code');
    expect(prompt).toContain('todo');
    expect(prompt).toContain('table');
  });
});
