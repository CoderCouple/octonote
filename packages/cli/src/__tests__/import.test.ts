import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerImportCommand } from '../commands/import.js';

describe('octo import', () => {
  let container: Container;
  let program: Command;
  let tmpFile: string;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerImportCommand(program, container);

    // Create a temp markdown file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octo-import-'));
    tmpFile = path.join(tmpDir, 'test.md');
    fs.writeFileSync(tmpFile, `---
title: Imported Note
tags:
  - imported
  - test
---

# Hello

This is an imported note.

- Item one
- Item two
`, 'utf-8');
  });

  it('imports a markdown file', async () => {
    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'import', tmpFile]);
    });

    const output = lines.join('\n');
    expect(output).toContain('Imported');
    expect(output).toContain('Imported Note');

    const notes = container.noteRepository.listNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('Imported Note');
  });
});
