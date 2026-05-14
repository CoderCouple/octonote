import { Router } from 'express';
import type { Container } from '@octonote/core';
import { resolveNote } from './helpers';

export function linksRouter(container: Container): Router {
  const router = Router();
  const { linkGraph } = container;

  // Get forward + backlinks for a note
  router.get('/notes/:id/links', async (req, res, next) => {
    try {
      const note = await resolveNote(container, req.params.id);
      const forward = await linkGraph.getForwardLinks(note.id);
      const backlinks = await linkGraph.getBacklinks(note.id);
      res.json({ forward, backlinks });
    } catch (err) { next(err); }
  });

  // Get full graph
  router.get('/graph', async (_req, res, next) => {
    try {
      const data = await linkGraph.getGraphData();
      res.json(data);
    } catch (err) { next(err); }
  });

  return router;
}
