import { Router } from 'express';
import type { Container } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from './helpers';

export function notesRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();
  const { noteRepository, searchEngine } = container;

  // List notes (query: ?folder=, ?tag=)
  router.get('/', async (_req, res, next) => {
    try {
      const folder = _req.query.folder as string | undefined;
      const tag = _req.query.tag as string | undefined;
      const notes = await noteRepository.listNotes({
        folderId: folder,
        tag,
      });
      res.json(notes);
    } catch (err) { next(err); }
  });

  // Get note with blocks + tags
  router.get('/:id', async (req, res, next) => {
    try {
      const note = await resolveNote(container, req.params.id);
      res.json(note);
    } catch (err) { next(err); }
  });

  // Create note
  router.post('/', async (req, res, next) => {
    try {
      const { title, folderId, storageFmt } = req.body;
      if (!title) {
        res.status(400).json({ error: 'title is required', status: 400 });
        return;
      }
      const note = await noteRepository.createNote(title, folderId, storageFmt);
      await fullSave(container, note.id, broadcaster);
      broadcaster.broadcast('note:created', { noteId: note.id, title: note.title });
      res.status(201).json(await noteRepository.getNote(note.id));
    } catch (err) { next(err); }
  });

  // Update title/folder
  router.patch('/:id', async (req, res, next) => {
    try {
      const note = await resolveNote(container, req.params.id);
      const { title, folderId } = req.body;
      await noteRepository.updateNote(note.id, { title, folderId });
      await fullSave(container, note.id, broadcaster);
      res.json(await noteRepository.getNote(note.id));
    } catch (err) { next(err); }
  });

  // Delete note + cleanup
  router.delete('/:id', async (req, res, next) => {
    try {
      const note = await resolveNote(container, req.params.id);
      await noteRepository.deleteNote(note.id);
      searchEngine.removeNote(note.id);
      broadcaster.broadcast('note:deleted', { noteId: note.id });
      res.json({ deleted: true, noteId: note.id });
    } catch (err) { next(err); }
  });

  return router;
}
