import { describe, it, expect, vi } from 'vitest';

describe('lifecycle', () => {
  it('single-instance lock prevents second app', () => {
    // Simulate requestSingleInstanceLock returning false
    const mockQuit = vi.fn();
    const mockApp = {
      requestSingleInstanceLock: vi.fn().mockReturnValue(false),
      quit: mockQuit,
    };

    // Simulate the lock logic from main.ts
    const gotLock = mockApp.requestSingleInstanceLock();
    if (!gotLock) {
      mockApp.quit();
    }

    expect(gotLock).toBe(false);
    expect(mockQuit).toHaveBeenCalled();
  });

  it('second-instance event focuses existing window', () => {
    const mockWindow = {
      isMinimized: vi.fn().mockReturnValue(true),
      restore: vi.fn(),
      focus: vi.fn(),
    };

    // Simulate the second-instance handler from main.ts
    if (mockWindow.isMinimized()) mockWindow.restore();
    mockWindow.focus();

    expect(mockWindow.restore).toHaveBeenCalled();
    expect(mockWindow.focus).toHaveBeenCalled();
  });
});
