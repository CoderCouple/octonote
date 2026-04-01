import * as path from 'path';

export interface AppPaths {
  isDev: boolean;
  webDist: string;
  loadUrl: (port: number) => string;
}

export function resolveAppPaths(argv: string[] = process.argv): AppPaths {
  const isDev = argv.includes('--dev') || process.env.ELECTRON_DEV === '1';

  let webDist: string;
  if (isDev) {
    // In dev, resolve from the monorepo root
    const monorepoRoot = path.resolve(__dirname, '..', '..', '..');
    webDist = path.join(monorepoRoot, 'packages', 'web', 'dist');
  } else {
    // In production, electron-builder copies web/dist to resources/web-dist
    webDist = path.join(process.resourcesPath || '', 'web-dist');
  }

  return {
    isDev,
    webDist,
    loadUrl: (port: number) => `http://127.0.0.1:${port}`,
  };
}
