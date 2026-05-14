import { Router } from 'express';
import type { Container } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from './helpers';

export function tagsRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();
  const { noteRepository } = container;

  // List all tags
  router.get('/', async (_req, res, next) => {
    try {
      const tags = await noteRepository.listTags();
      res.json(tags);
    } catch (err) { next(err); }
  });

  // Add tag to note
  router.post('/notes/:id/tags', async (req, res, next) => {
    try {
      const note = await resolveNote(container, req.params.id);
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name is required', status: 400 });
        return;
      }
      const tag = await noteRepository.addTagToNote(note.id, name);
      await fullSave(container, note.id, broadcaster);
      broadcaster.broadcast('tags:updated', { noteId: note.id });
      res.status(201).json(tag);
    } catch (err) { next(err); }
  });

  // Remove tag from note
  router.delete('/notes/:id/tags/:tagName', async (req, res, next) => {
    try {
      const note = await resolveNote(container, req.params.id);
      const tag = await noteRepository.getTagByName(req.params.tagName);
      if (!tag) {
        res.status(404).json({ error: `Tag not found: ${req.params.tagName}`, status: 404 });
        return;
      }
      await noteRepository.removeTagFromNote(note.id, tag.id);
      await fullSave(container, note.id, broadcaster);
      broadcaster.broadcast('tags:updated', { noteId: note.id });
      res.json({ deleted: true, tag: req.params.tagName });
    } catch (err) { next(err); }
  });

  return router;
}
