import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import express from 'express';
import type { Container } from '@octonote/core';
import { cors } from './middleware/cors';
import { errorHandler } from './middleware/errors';
import { Broadcaster } from './ws/broadcaster';
import { notesRouter } from './routes/notes';
import { blocksRouter } from './routes/blocks';
import { searchRouter } from './routes/search';
import { tagsRouter } from './routes/tags';
import { linksRouter } from './routes/links';
import { foldersRouter } from './routes/folders';
import { projectsRouter } from './routes/projects';
import { embedRouter } from './routes/embed';
import { meetingsRouter } from './routes/meetings';
import { aiRouter } from './routes/ai';

export interface ServerInstance {
  app: express.Express;
  server: http.Server;
  broadcaster: Broadcaster;
}

export function createServer(container: Container): ServerInstance {
  const app = express();
  const broadcaster = new Broadcaster();

  // Body parsing + CORS
  app.use(express.json());
  app.use(cors);

  // API routes
  app.use('/api/notes/:id/blocks', blocksRouter(container, broadcaster));
  app.use('/api/notes', notesRouter(container, broadcaster));
  app.use('/api/search', searchRouter(container));
  app.use('/api/tags', tagsRouter(container, broadcaster));
  app.use('/api/folders', foldersRouter(container));
  app.use('/api/projects', projectsRouter(container, broadcaster));
  app.use('/api/embed', embedRouter());
  app.use('/api/meetings', meetingsRouter(container, broadcaster));
  app.use('/api', linksRouter(container));
  app.use('/api/ai', aiRouter(container, broadcaster));

  // Serve static files from web build (Phase 5 prep)
  const webDist = process.env.OCTONOTE_WEB_DIST || path.join(__dirname, '..', '..', 'web', 'dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  // Error handler (must be last)
  app.use(errorHandler);

  // Create HTTP server + attach WebSocket
  const server = http.createServer(app);
  broadcaster.attach(server);

  return { app, server, broadcaster };
}

export { Broadcaster } from './ws/broadcaster';
export { startServer } from './start';
