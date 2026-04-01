import { Router } from 'express';
import type { Container } from '@octonote/core';

export function foldersRouter(container: Container): Router {
  const router = Router();
  const { noteRepository } = container;

  // List all folders
  router.get('/', (_req, res) => {
    const folders = noteRepository.listFolders();
    res.json(folders);
  });

  // Create folder
  router.post('/', (req, res) => {
    const { name, parentId } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required', status: 400 });
      return;
    }
    const folder = noteRepository.createFolder(name, parentId);
    res.status(201).json(folder);
  });

  // Rename folder
  router.patch('/:id', (req, res) => {
    const { name } = req.body;
    const folder = noteRepository.getFolder(req.params.id);
    if (!folder) {
      res.status(404).json({ error: 'Folder not found', status: 404 });
      return;
    }
    // NoteRepository doesn't have updateFolder, so delete and recreate is not ideal.
    // We'll run a direct SQL update via the db instance.
    (container as any).db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, req.params.id);
    const updated = noteRepository.getFolder(req.params.id);
    res.json(updated);
  });

  // Delete folder
  router.delete('/:id', (req, res) => {
    const folder = noteRepository.getFolder(req.params.id);
    if (!folder) {
      res.status(404).json({ error: 'Folder not found', status: 404 });
      return;
    }
    noteRepository.deleteFolder(req.params.id);
    res.json({ deleted: true, folderId: req.params.id });
  });

  return router;
}
