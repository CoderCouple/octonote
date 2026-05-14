import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { resolveApiKey } from '../apiKey';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('resolveApiKey', () => {
  let tmpDir: string;
  let container: Container;

  afterEach(async () => {
    delete process.env.ANTHROPIC_API_KEY;
    if (container) await container.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  async function setup(): Promise<Container> {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-ai-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);
    return container;
  }

  it('resolves from environment variable', async () => {
    const c = await setup();
    process.env.ANTHROPIC_API_KEY = 'sk-env-key';
    expect(resolveApiKey(c)).toBe('sk-env-key');
  });

  it('env var takes priority over config', async () => {
    const c = await setup();
    c.vaultManager.setConfig({ anthropicApiKey: 'sk-config-key' });
    process.env.ANTHROPIC_API_KEY = 'sk-env-key';
    expect(resolveApiKey(c)).toBe('sk-env-key');
  });

  it('falls back to config when no env var', async () => {
    const c = await setup();
    c.vaultManager.setConfig({ anthropicApiKey: 'sk-config-key' });
    expect(resolveApiKey(c)).toBe('sk-config-key');
  });

  it('throws when no key found', async () => {
    const c = await setup();
    expect(() => resolveApiKey(c)).toThrow('Anthropic API key not found');
  });
});
