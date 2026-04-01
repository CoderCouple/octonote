import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { VaultManager } from '../engine/VaultManager';
import { BlockEngine } from '../engine/BlockEngine';
import { BlockType, Note, Block } from '../models/types';

describe('VaultManager', () => {
  let tmpDir: string;
  let manager: VaultManager;
  const blockEngine = new BlockEngine();

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-vault-'));
    manager = new VaultManager(tmpDir, blockEngine);
  });

  afterEach(async () => {
    await manager.stopWatching();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeNote(title: string, fmt: 'json' | 'markdown' = 'json'): Note {
    return {
      id: 'note-1',
      title,
      folderId: null,
      storageFmt: fmt,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      tags: [{ id: 't1', name: 'test' }],
    };
  }

  function makeBlocks(): Block[] {
    return [
      { id: 'b1', noteId: 'note-1', type: BlockType.Heading, content: 'Title', meta: { level: 1 }, position: 0, parentId: null },
      { id: 'b2', noteId: 'note-1', type: BlockType.Paragraph, content: 'Body text.', meta: {}, position: 1, parentId: null },
    ];
  }

  it('ensures vault structure', () => {
    manager.ensureVault();
    expect(fs.existsSync(path.join(tmpDir, 'vault'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'config.json'))).toBe(true);
  });

  it('saves and loads JSON notes', () => {
    manager.ensureVault();
    const note = makeNote('My Note');
    const blocks = makeBlocks();

    const filePath = manager.saveNote(note, blocks);
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = manager.loadNote(filePath);
    expect(loaded.note.title).toBe('My Note');
    expect(loaded.blocks.length).toBe(2);
  });

  it('saves and loads Markdown notes', () => {
    manager.ensureVault();
    const note = makeNote('MD Note', 'markdown');
    const blocks = makeBlocks();

    const filePath = manager.saveNote(note, blocks);
    expect(filePath.endsWith('.md')).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('title: MD Note');

    const loaded = manager.loadNote(filePath);
    expect(loaded.note.title).toBe('MD Note');
  });

  it('exports to markdown', () => {
    manager.ensureVault();
    const destPath = path.join(tmpDir, 'export', 'note.md');
    manager.exportToMarkdown(makeNote('Export'), makeBlocks(), destPath);
    expect(fs.existsSync(destPath)).toBe(true);
    const content = fs.readFileSync(destPath, 'utf-8');
    expect(content).toContain('# Title');
  });

  it('imports from markdown', () => {
    manager.ensureVault();
    const mdPath = path.join(tmpDir, 'test.md');
    fs.writeFileSync(mdPath, '---\ntitle: Imported\n---\n\n# Hello\n\nWorld\n', 'utf-8');

    const { note, blocks } = manager.importFromMarkdown(mdPath);
    expect(note.title).toBe('Imported');
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('reads and writes config', () => {
    manager.ensureVault();
    const config = manager.getConfig();
    expect(config.vaultPath).toBe(tmpDir);

    manager.setConfig({ theme: 'dark' });
    const updated = manager.getConfig();
    expect(updated.theme).toBe('dark');
  });
});
