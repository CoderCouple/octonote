import { describe, it, expect, beforeEach } from 'vitest';
import type { Container } from '@octonote/core';
import { createTestContainer, captureOutput } from './helpers.js';
import { Command } from 'commander';
import { registerConfigCommand } from '../commands/config.js';

describe('octo config', () => {
  let container: Container;
  let program: Command;

  beforeEach(() => {
    container = createTestContainer();
    program = new Command();
    program.exitOverride();
    registerConfigCommand(program, container);
  });

  it('lists config values', async () => {
    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'config']);
    });

    const output = lines.join('\n');
    expect(output).toContain('vaultPath');
    expect(output).toContain('storageFmt');
  });

  it('sets a config value', async () => {
    const lines = await captureOutput(() => {
      program.parse(['node', 'test', 'config', '--theme', 'dark']);
    });

    const output = lines.join('\n');
    expect(output).toContain('Config updated');

    const config = container.vaultManager.getConfig();
    expect(config.theme).toBe('dark');
  });
});
