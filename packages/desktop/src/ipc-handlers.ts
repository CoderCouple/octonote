import { ipcMain, dialog, app } from 'electron';

const IPC_CHANNELS = ['dialog:open', 'dialog:save', 'app:version'] as const;

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Notes', extensions: ['md', 'note'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? undefined : result.filePaths;
  });

  ipcMain.handle('dialog:save', async () => {
    const result = await dialog.showSaveDialog({
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Note', extensions: ['note'] },
      ],
    });
    return result.canceled ? undefined : result.filePath;
  });

  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });
}

export function removeIpcHandlers(): void {
  for (const channel of IPC_CHANNELS) {
    ipcMain.removeHandler(channel);
  }
}
