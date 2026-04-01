import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Container, BlockType } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerExportCommand } from '../commands/export.js';

describe('octo export', () => {
  let container: Container;
  let program: Command;
  let tmpDir: string;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerExportCommand(program, container);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octo-export-'));
  });

  it('exports a note as markdown', async () => {
    const note = container.noteRepository.createNote('Export Test');
    container.noteRepository.createBlock({
      noteId: note.id,
      type: 'paragraph' as BlockType,
      content: 'Hello world',
      meta: {},
      position: 0,
      parentId: null,
    });

    const dest = path.join(tmpDir, 'exported.md');

    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'export', 'Export Test', dest]);
    });

    const output = lines.join('\n');
    expect(output).toContain('Exported');

    const content = fs.readFileSync(dest, 'utf-8');
    expect(content).toContain('Hello world');
    expect(content).toContain('Export Test');
  });
});
