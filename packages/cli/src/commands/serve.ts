import type { Command } from 'commander';
import type { Container } from '@octonote/core';

export function registerServeCommand(program: Command, container: Container): void {
  program
    .command('serve')
    .description('Start the OctoNote web server')
    .option('--port <number>', 'Port to listen on', (v: string) => parseInt(v, 10))
    .option('--no-open', 'Do not open browser automatically')
    .action(async (opts: { port?: number; open?: boolean }) => {
      const { startServer } = await import('@octonote/server');
      startServer(container, {
        port: opts.port,
        open: opts.open,
      });
    });
}
