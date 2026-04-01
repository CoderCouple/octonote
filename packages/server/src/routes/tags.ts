import { Router } from 'express';
import type { Container } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from './helpers';

export function tagsRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();
  const { noteRepository } = container;

  // List all tags
  router.get('/', (_req, res) => {
    const tags = noteRepository.listTags();
    res.json(tags);
  });

  // Add tag to note
  router.post('/notes/:id/tags', (req, res) => {
    const note = resolveNote(container, req.params.id);
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required', status: 400 });
      return;
    }
    const tag = noteRepository.addTagToNote(note.id, name);
    fullSave(container, note.id, broadcaster);
    broadcaster.broadcast('tags:updated', { noteId: note.id });
    res.status(201).json(tag);
  });

  // Remove tag from note
  router.delete('/notes/:id/tags/:tagName', (req, res) => {
    const note = resolveNote(container, req.params.id);
    const tag = noteRepository.getTagByName(req.params.tagName);
    if (!tag) {
      res.status(404).json({ error: `Tag not found: ${req.params.tagName}`, status: 404 });
      return;
    }
    noteRepository.removeTagFromNote(note.id, tag.id);
    fullSave(container, note.id, broadcaster);
    broadcaster.broadcast('tags:updated', { noteId: note.id });
    res.json({ deleted: true, tag: req.params.tagName });
  });

  return router;
}
