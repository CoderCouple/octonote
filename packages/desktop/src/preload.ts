import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('octonoteDesktop', {
  platform: process.platform,

  onMenuEvent(callback: (event: string) => void) {
    ipcRenderer.on('menu:new-note', () => callback('new-note'));
    return () => {
      ipcRenderer.removeAllListeners('menu:new-note');
    };
  },

  showOpenDialog(): Promise<string[] | undefined> {
    return ipcRenderer.invoke('dialog:open');
  },

  showSaveDialog(): Promise<string | undefined> {
    return ipcRenderer.invoke('dialog:save');
  },

  getVersion(): Promise<string> {
    return ipcRenderer.invoke('app:version');
  },
});
