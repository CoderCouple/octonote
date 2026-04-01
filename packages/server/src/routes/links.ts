import { Router } from 'express';
import type { Container } from '@octonote/core';
import { resolveNote } from './helpers';

export function linksRouter(container: Container): Router {
  const router = Router();
  const { linkGraph } = container;

  // Get forward + backlinks for a note
  router.get('/notes/:id/links', (req, res) => {
    const note = resolveNote(container, req.params.id);
    const forward = linkGraph.getForwardLinks(note.id);
    const backlinks = linkGraph.getBacklinks(note.id);
    res.json({ forward, backlinks });
  });

  // Get full graph
  router.get('/graph', (_req, res) => {
    const data = linkGraph.getGraphData();
    res.json(data);
  });

  return router;
}
