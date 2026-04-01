import { describe, it, expect, beforeEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerTodayCommand } from '../commands/today.js';

describe('octo today', () => {
  let container: Container;
  let program: Command;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerTodayCommand(program, container);
  });

  it('creates and displays daily note', async () => {
    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'today']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Daily:');
  });

  it('outputs JSON with note and streak', async () => {
    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'today', '--output', 'json']);
    });

    const parsed = JSON.parse(lines.join('\n'));
    expect(parsed.note).toBeDefined();
    expect(parsed.note.title).toContain('Daily:');
    expect(typeof parsed.streak).toBe('number');
  });
});
