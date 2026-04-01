import { Router } from 'express';
import type { Container } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from './helpers';

export function notesRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();
  const { noteRepository, searchEngine } = container;

  // List notes (query: ?folder=, ?tag=)
  router.get('/', (_req, res) => {
    const folder = _req.query.folder as string | undefined;
    const tag = _req.query.tag as string | undefined;
    const notes = noteRepository.listNotes({
      folderId: folder,
      tag,
    });
    res.json(notes);
  });

  // Get note with blocks + tags
  router.get('/:id', (req, res) => {
    const note = resolveNote(container, req.params.id);
    res.json(note);
  });

  // Create note
  router.post('/', (req, res) => {
    const { title, folderId, storageFmt } = req.body;
    if (!title) {
      res.status(400).json({ error: 'title is required', status: 400 });
      return;
    }
    const note = noteRepository.createNote(title, folderId, storageFmt);
    fullSave(container, note.id, broadcaster);
    broadcaster.broadcast('note:created', { noteId: note.id, title: note.title });
    res.status(201).json(noteRepository.getNote(note.id));
  });

  // Update title/folder
  router.patch('/:id', (req, res) => {
    const note = resolveNote(container, req.params.id);
    const { title, folderId } = req.body;
    noteRepository.updateNote(note.id, { title, folderId });
    fullSave(container, note.id, broadcaster);
    res.json(noteRepository.getNote(note.id));
  });

  // Delete note + cleanup
  router.delete('/:id', (req, res) => {
    const note = resolveNote(container, req.params.id);
    noteRepository.deleteNote(note.id);
    searchEngine.removeNote(note.id);
    broadcaster.broadcast('note:deleted', { noteId: note.id });
    res.json({ deleted: true, noteId: note.id });
  });

  return router;
}
