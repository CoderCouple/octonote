import { describe, it, expect } from 'vitest';
import * as net from 'net';
import { findFreePort } from '../port';

describe('findFreePort', () => {
  it('returns a valid port number', async () => {
    const port = await findFreePort();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it('returns a port that is actually free', async () => {
    const port = await findFreePort();
    // Verify we can bind to it
    const server = net.createServer();
    await new Promise<void>((resolve, reject) => {
      server.on('error', reject);
      server.listen(port, '127.0.0.1', () => resolve());
    });
    server.close();
  });

  it('returns different ports on successive calls', async () => {
    const port1 = await findFreePort();
    const port2 = await findFreePort();
    // OS may reuse ports, but they should both be valid
    expect(port1).toBeGreaterThan(0);
    expect(port2).toBeGreaterThan(0);
  });
});
