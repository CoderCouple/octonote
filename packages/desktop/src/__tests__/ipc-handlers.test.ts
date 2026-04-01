import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHandle, mockRemoveHandler } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRemoveHandler: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
  app: {
    getVersion: vi.fn().mockReturnValue('0.1.0'),
  },
}));

import { registerIpcHandlers, removeIpcHandlers } from '../ipc-handlers';

describe('ipc-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all IPC channels', () => {
    registerIpcHandlers();
    const channels = mockHandle.mock.calls.map((c: any) => c[0]);
    expect(channels).toContain('dialog:open');
    expect(channels).toContain('dialog:save');
    expect(channels).toContain('app:version');
  });

  it('removes all IPC channels', () => {
    removeIpcHandlers();
    const channels = mockRemoveHandler.mock.calls.map((c: any) => c[0]);
    expect(channels).toContain('dialog:open');
    expect(channels).toContain('dialog:save');
    expect(channels).toContain('app:version');
  });
});
