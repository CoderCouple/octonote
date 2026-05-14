import { Router } from 'express';
import type { Container } from '@octonote/core';

export function searchRouter(container: Container): Router {
  const router = Router();
  const { searchEngine, noteRepository } = container;

  // Search notes
  router.get('/', async (req, res, next) => {
    try {
      const q = req.query.q as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      if (!q) {
        res.status(400).json({ error: 'q query parameter is required', status: 400 });
        return;
      }

      // Rebuild index from all notes before searching
      const allNotes = await noteRepository.listNotes();
      const notesWithBlocks = [];
      for (const n of allNotes) {
        const full = await noteRepository.getNote(n.id);
        if (full) notesWithBlocks.push(full);
      }
      searchEngine.rebuildIndex(notesWithBlocks);

      const results = searchEngine.search(q, { limit });
      res.json(results);
    } catch (err) { next(err); }
  });

  return router;
}
