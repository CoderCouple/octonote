import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { resolveApiKey } from '../apiKey';

describe('resolveApiKey', () => {
  let tmpDir: string;
  let container: Container;

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function setup(): Container {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-ai-'));
    container = createContainer(tmpDir);
    return container;
  }

  it('resolves from environment variable', () => {
    const c = setup();
    process.env.ANTHROPIC_API_KEY = 'sk-env-key';
    expect(resolveApiKey(c)).toBe('sk-env-key');
  });

  it('env var takes priority over config', () => {
    const c = setup();
    c.vaultManager.setConfig({ anthropicApiKey: 'sk-config-key' });
    process.env.ANTHROPIC_API_KEY = 'sk-env-key';
    expect(resolveApiKey(c)).toBe('sk-env-key');
  });

  it('falls back to config when no env var', () => {
    const c = setup();
    c.vaultManager.setConfig({ anthropicApiKey: 'sk-config-key' });
    expect(resolveApiKey(c)).toBe('sk-config-key');
  });

  it('throws when no key found', () => {
    const c = setup();
    expect(() => resolveApiKey(c)).toThrow('Anthropic API key not found');
  });
});
