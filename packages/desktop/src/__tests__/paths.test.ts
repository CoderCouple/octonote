import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { resolveAppPaths } from '../paths';

describe('resolveAppPaths', () => {
  const originalEnv = process.env.ELECTRON_DEV;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ELECTRON_DEV;
    } else {
      process.env.ELECTRON_DEV = originalEnv;
    }
  });

  it('detects dev mode from --dev flag', () => {
    const paths = resolveAppPaths(['node', 'main.js', '--dev']);
    expect(paths.isDev).toBe(true);
  });

  it('detects dev mode from ELECTRON_DEV env var', () => {
    process.env.ELECTRON_DEV = '1';
    const paths = resolveAppPaths(['node', 'main.js']);
    expect(paths.isDev).toBe(true);
  });

  it('defaults to production mode', () => {
    delete process.env.ELECTRON_DEV;
    const paths = resolveAppPaths(['node', 'main.js']);
    expect(paths.isDev).toBe(false);
  });

  it('resolves webDist to packages/web/dist in dev mode', () => {
    const paths = resolveAppPaths(['node', 'main.js', '--dev']);
    expect(paths.webDist).toContain(path.join('packages', 'web', 'dist'));
  });

  it('returns loadUrl with correct format', () => {
    const paths = resolveAppPaths(['node', 'main.js']);
    expect(paths.loadUrl(3000)).toBe('http://127.0.0.1:3000');
    expect(paths.loadUrl(4242)).toBe('http://127.0.0.1:4242');
  });
});
