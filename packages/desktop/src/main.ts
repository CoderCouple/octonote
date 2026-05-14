import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import { createContainer } from '@octonote/core';
import { createServer } from '@octonote/server';
import { findFreePort } from './port';
import { resolveAppPaths } from './paths';
import { registerIpcHandlers, removeIpcHandlers } from './ipc-handlers';
import { buildMenu } from './menu';
import { createTray, destroyTray } from './tray';

let mainWindow: BrowserWindow | null = null;

async function bootstrap(): Promise<void> {
  // Resolve dev vs production paths
  const paths = resolveAppPaths();

  // Point server at the correct web dist directory
  process.env.OCTONOTE_WEB_DIST = paths.webDist;

  // Bootstrap core container
  const container = await createContainer();

  // Start Express server on a free port (or 4242 in dev)
  const port = paths.isDev ? 4242 : await findFreePort();
  const { server } = createServer(container);

  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve());
  });

  // Set up native chrome
  registerIpcHandlers();
  Menu.setApplicationMenu(buildMenu());

  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'OctoNote',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  await mainWindow.loadURL(paths.loadUrl(port));

  createTray(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock — prevent DB conflicts
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrap);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    destroyTray();
    removeIpcHandlers();
  });
}
