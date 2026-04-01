import { Router, Request, Response } from 'express';
import type { Container, BlockType } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from './helpers';

interface NoteParams { id: string; [key: string]: string }
interface BlockParams { id: string; blockId: string; [key: string]: string }

export function blocksRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router({ mergeParams: true });
  const { noteRepository } = container;

  // Append blocks
  router.post('/', (req: Request<NoteParams>, res: Response) => {
    const note = resolveNote(container, req.params.id);
    const { blocks } = req.body;
    if (!Array.isArray(blocks)) {
      res.status(400).json({ error: 'blocks array is required', status: 400 });
      return;
    }

    const existing = noteRepository.getBlocksByNote(note.id);
    let position = existing.length;

    const created = blocks.map((b: { type: BlockType; content: string; meta?: Record<string, unknown> }) => {
      const block = noteRepository.createBlock({
        noteId: note.id,
        type: b.type,
        content: b.content,
        meta: b.meta || {},
        position: position++,
        parentId: null,
      });
      return block;
    });

    fullSave(container, note.id, broadcaster);
    broadcaster.broadcast('blocks:updated', { noteId: note.id });
    res.status(201).json(created);
  });

  // Replace all blocks
  router.put('/', (req: Request<NoteParams>, res: Response) => {
    const note = resolveNote(container, req.params.id);
    const { blocks } = req.body;
    if (!Array.isArray(blocks)) {
      res.status(400).json({ error: 'blocks array is required', status: 400 });
      return;
    }

    // Delete existing blocks
    const existing = noteRepository.getBlocksByNote(note.id);
    for (const eb of existing) {
      noteRepository.deleteBlock(eb.id);
    }

    // Create new blocks
    const created = blocks.map((b: { type: BlockType; content: string; meta?: Record<string, unknown> }, i: number) => {
      return noteRepository.createBlock({
        noteId: note.id,
        type: b.type,
        content: b.content,
        meta: b.meta || {},
        position: i,
        parentId: null,
      });
    });

    fullSave(container, note.id, broadcaster);
    broadcaster.broadcast('blocks:updated', { noteId: note.id });
    res.json(created);
  });

  // Update single block
  router.patch('/:blockId', (req: Request<BlockParams>, res: Response) => {
    resolveNote(container, req.params.id); // ensure note exists
    const { content, type, meta } = req.body;
    noteRepository.updateBlock(req.params.blockId, { content, type, meta });
    fullSave(container, req.params.id, broadcaster);
    broadcaster.broadcast('blocks:updated', { noteId: req.params.id });

    const blocks = noteRepository.getBlocksByNote(req.params.id);
    const updated = blocks.find(b => b.id === req.params.blockId);
    res.json(updated);
  });

  // Delete single block
  router.delete('/:blockId', (req: Request<BlockParams>, res: Response) => {
    const note = resolveNote(container, req.params.id);
    noteRepository.deleteBlock(req.params.blockId);

    // Reorder remaining blocks
    const remaining = noteRepository.getBlocksByNote(note.id);
    noteRepository.reorderBlocks(note.id, remaining.map(b => b.id));

    fullSave(container, note.id, broadcaster);
    broadcaster.broadcast('blocks:updated', { noteId: note.id });
    res.json({ deleted: true, blockId: req.params.blockId });
  });

  return router;
}
