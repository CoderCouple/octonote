import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDestroy = vi.fn();
const mockSetToolTip = vi.fn();
const mockSetContextMenu = vi.fn();
const mockOn = vi.fn();

vi.mock('electron', () => {
  return {
    Tray: vi.fn().mockImplementation(() => ({
      setToolTip: mockSetToolTip,
      setContextMenu: mockSetContextMenu,
      on: mockOn,
      destroy: mockDestroy,
    })),
    Menu: {
      buildFromTemplate: vi.fn().mockReturnValue({}),
    },
    BrowserWindow: vi.fn(),
    nativeImage: {
      createFromPath: vi.fn().mockReturnValue({ isEmpty: () => true }),
      createEmpty: vi.fn().mockReturnValue({}),
    },
  };
});

import { createTray, destroyTray } from '../tray';

describe('tray', () => {
  const mockWindow = {
    show: vi.fn(),
    focus: vi.fn(),
    webContents: { send: vi.fn() },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module-level tray state
    destroyTray();
    vi.clearAllMocks();
  });

  it('sets tooltip to OctoNote', () => {
    createTray(mockWindow);
    expect(mockSetToolTip).toHaveBeenCalledWith('OctoNote');
  });

  it('sets a context menu', () => {
    createTray(mockWindow);
    expect(mockSetContextMenu).toHaveBeenCalled();
  });

  it('destroyTray cleans up', () => {
    createTray(mockWindow);
    mockDestroy.mockClear();
    destroyTray();
    expect(mockDestroy).toHaveBeenCalled();
  });
});
