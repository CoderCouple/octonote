import { Router } from 'express';
import type { Container } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';

export function bookmarksRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();
  const { noteRepository } = container;

  // ── Groups ──────────────────────────────────────────────

  router.get('/groups', async (_req, res, next) => {
    try {
      const groups = await noteRepository.listBookmarkGroups();
      res.json(groups);
    } catch (err) { next(err); }
  });

  router.post('/groups', async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const group = await noteRepository.createBookmarkGroup(name);
      broadcaster.broadcast('bookmark-group:created', { id: group.id, name: group.name });
      res.status(201).json(group);
    } catch (err) { next(err); }
  });

  router.patch('/groups/:id', async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      await noteRepository.updateBookmarkGroup(req.params.id, name);
      broadcaster.broadcast('bookmark-group:updated', { id: req.params.id });
      res.json({ id: req.params.id, name });
    } catch (err) { next(err); }
  });

  router.delete('/groups/:id', async (req, res, next) => {
    try {
      await noteRepository.deleteBookmarkGroup(req.params.id);
      broadcaster.broadcast('bookmark-group:deleted', { id: req.params.id });
      res.json({ deleted: true, id: req.params.id });
    } catch (err) { next(err); }
  });

  // ── Bookmarks ───────────────────────────────────────────

  router.get('/', async (req, res, next) => {
    try {
      const groupId = typeof req.query.group === 'string' ? req.query.group : undefined;
      const bookmarks = await noteRepository.listBookmarks(groupId);
      res.json(bookmarks);
    } catch (err) { next(err); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { groupId, title, url, description } = req.body;
      if (!groupId || !title || !url) {
        res.status(400).json({ error: 'groupId, title, and url are required' });
        return;
      }
      const bookmark = await noteRepository.createBookmark(groupId, title, url, description);
      broadcaster.broadcast('bookmark:created', { id: bookmark.id, groupId: bookmark.groupId });
      res.status(201).json(bookmark);
    } catch (err) { next(err); }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const { title, url, description, groupId } = req.body;
      await noteRepository.updateBookmark(req.params.id, { title, url, description, groupId });
      broadcaster.broadcast('bookmark:updated', { id: req.params.id });
      res.json({ id: req.params.id });
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await noteRepository.deleteBookmark(req.params.id);
      broadcaster.broadcast('bookmark:deleted', { id: req.params.id });
      res.json({ deleted: true, id: req.params.id });
    } catch (err) { next(err); }
  });

  return router;
}
