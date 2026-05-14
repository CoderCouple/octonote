import type { Container } from '@octonote/core';
import { createServer } from './index';

export interface StartOptions {
  port?: number;
  open?: boolean;
}

const DEFAULT_PORT = 4242;

export function startServer(container: Container, options: StartOptions = {}): void {
  const config = container.vaultManager.getConfig();
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const port = options.port || envPort || config.port || DEFAULT_PORT;

  const { server } = createServer(container);

  server.listen(port, () => {
    console.log(`OctoNote server running at http://localhost:${port}`);

    if (options.open !== false) {
      // Dynamic import of open (ESM package)
      import('open').then(mod => {
        const openFn = mod.default || mod;
        openFn(`http://localhost:${port}`);
      }).catch(() => {
        // open failed — non-fatal
      });
    }
  });
}
