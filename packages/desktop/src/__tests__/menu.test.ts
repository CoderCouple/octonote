import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron
vi.mock('electron', () => {
  const buildFromTemplate = vi.fn().mockReturnValue({ items: [] });
  return {
    Menu: { buildFromTemplate },
    BrowserWindow: { getFocusedWindow: vi.fn() },
  };
});

import { Menu } from 'electron';
import { buildMenu } from '../menu';

describe('buildMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Menu.buildFromTemplate', () => {
    buildMenu();
    expect(Menu.buildFromTemplate).toHaveBeenCalledOnce();
  });

  it('includes File menu', () => {
    buildMenu();
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const fileMenu = template.find((m: any) => m.label === 'File');
    expect(fileMenu).toBeDefined();
  });

  it('includes Edit menu', () => {
    buildMenu();
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const editMenu = template.find((m: any) => m.label === 'Edit');
    expect(editMenu).toBeDefined();
  });

  it('includes View menu', () => {
    buildMenu();
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const viewMenu = template.find((m: any) => m.label === 'View');
    expect(viewMenu).toBeDefined();
  });

  it('includes Help menu', () => {
    buildMenu();
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const helpMenu = template.find((m: any) => m.label === 'Help');
    expect(helpMenu).toBeDefined();
  });
});
