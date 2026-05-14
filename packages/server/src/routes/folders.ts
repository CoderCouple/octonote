import { Router } from 'express';
import type { Container } from '@octonote/core';

export function foldersRouter(container: Container): Router {
  const router = Router();
  const { noteRepository } = container;

  // List all folders
  router.get('/', async (_req, res, next) => {
    try {
      const folders = await noteRepository.listFolders();
      res.json(folders);
    } catch (err) { next(err); }
  });

  // Create folder
  router.post('/', async (req, res, next) => {
    try {
      const { name, parentId } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name is required', status: 400 });
        return;
      }
      const folder = await noteRepository.createFolder(name, parentId);
      res.status(201).json(folder);
    } catch (err) { next(err); }
  });

  // Rename folder
  router.patch('/:id', async (req, res, next) => {
    try {
      const { name } = req.body;
      const folder = await noteRepository.getFolder(req.params.id);
      if (!folder) {
        res.status(404).json({ error: 'Folder not found', status: 404 });
        return;
      }
      await container.pool.query('UPDATE folders SET name = $1 WHERE id = $2', [name, req.params.id]);
      const updated = await noteRepository.getFolder(req.params.id);
      res.json(updated);
    } catch (err) { next(err); }
  });

  // Delete folder
  router.delete('/:id', async (req, res, next) => {
    try {
      const folder = await noteRepository.getFolder(req.params.id);
      if (!folder) {
        res.status(404).json({ error: 'Folder not found', status: 404 });
        return;
      }
      await noteRepository.deleteFolder(req.params.id);
      res.json({ deleted: true, folderId: req.params.id });
    } catch (err) { next(err); }
  });

  return router;
}
