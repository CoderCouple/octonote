import { Router } from 'express';
import type { Container } from '@octonote/core';

export function searchRouter(container: Container): Router {
  const router = Router();
  const { searchEngine, noteRepository } = container;

  // Search notes
  router.get('/', (req, res) => {
    const q = req.query.q as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    if (!q) {
      res.status(400).json({ error: 'q query parameter is required', status: 400 });
      return;
    }

    // Rebuild index from all notes before searching
    const allNotes = noteRepository.listNotes();
    const notesWithBlocks = allNotes.map(n => noteRepository.getNote(n.id)!);
    searchEngine.rebuildIndex(notesWithBlocks);

    const results = searchEngine.search(q, { limit });
    res.json(results);
  });

  return router;
}
