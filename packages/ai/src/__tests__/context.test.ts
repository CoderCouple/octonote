import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { buildSystemPrompt } from '../context';

describe('buildSystemPrompt', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function setup(): Container {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-ctx-'));
    return createContainer(tmpDir);
  }

  it('handles empty vault', () => {
    const c = setup();
    const prompt = buildSystemPrompt(c);
    expect(prompt).toContain('OctoNote');
    expect(prompt).toContain('(empty vault)');
    expect(prompt).toContain('0 notes');
    expect(prompt).toContain('Block Types Reference');
  });

  it('includes note titles', () => {
    const c = setup();
    c.noteRepository.createNote('My Test Note');
    const prompt = buildSystemPrompt(c);
    expect(prompt).toContain('My Test Note');
    expect(prompt).toContain('1 total');
  });

  it('includes tags', () => {
    const c = setup();
    const note = c.noteRepository.createNote('Tagged Note');
    c.noteRepository.addTagToNote(note.id, 'javascript');
    const prompt = buildSystemPrompt(c);
    expect(prompt).toContain('javascript');
  });

  it('includes folders', () => {
    const c = setup();
    c.noteRepository.createFolder('Projects');
    const prompt = buildSystemPrompt(c);
    expect(prompt).toContain('Projects');
  });

  it('includes link graph stats', () => {
    const c = setup();
    const n1 = c.noteRepository.createNote('Note A');
    const n2 = c.noteRepository.createNote('Note B');
    c.noteRepository.createLink(n1.id, n2.id);
    const prompt = buildSystemPrompt(c);
    expect(prompt).toContain('2 notes');
    expect(prompt).toContain('1 links');
  });

  it('includes block type reference', () => {
    const c = setup();
    const prompt = buildSystemPrompt(c);
    expect(prompt).toContain('paragraph');
    expect(prompt).toContain('heading');
    expect(prompt).toContain('code');
    expect(prompt).toContain('todo');
    expect(prompt).toContain('table');
  });
});
