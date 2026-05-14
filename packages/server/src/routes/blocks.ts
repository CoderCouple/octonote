import { Router, Request, Response, NextFunction } from 'express';
import type { Container, BlockType } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveNote, fullSave } from './helpers';

interface NoteParams { id: string; [key: string]: string }
interface BlockParams { id: string; blockId: string; [key: string]: string }

export function blocksRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router({ mergeParams: true });
  const { noteRepository } = container;

  // Append blocks
  router.post('/', async (req: Request<NoteParams>, res: Response, next: NextFunction) => {
    try {
      const note = await resolveNote(container, req.params.id);
      const { blocks } = req.body;
      if (!Array.isArray(blocks)) {
        res.status(400).json({ error: 'blocks array is required', status: 400 });
        return;
      }

      const existing = await noteRepository.getBlocksByNote(note.id);
      let position = existing.length;

      const created = [];
      for (const b of blocks as Array<{ type: BlockType; content: string; meta?: Record<string, unknown> }>) {
        const block = await noteRepository.createBlock({
          noteId: note.id,
          type: b.type,
          content: b.content,
          meta: b.meta || {},
          position: position++,
          parentId: null,
        });
        created.push(block);
      }

      await fullSave(container, note.id, broadcaster);
      broadcaster.broadcast('blocks:updated', { noteId: note.id });
      res.status(201).json(created);
    } catch (err) { next(err); }
  });

  // Replace all blocks
  router.put('/', async (req: Request<NoteParams>, res: Response, next: NextFunction) => {
    try {
      const note = await resolveNote(container, req.params.id);
      const { blocks } = req.body;
      if (!Array.isArray(blocks)) {
        res.status(400).json({ error: 'blocks array is required', status: 400 });
        return;
      }

      // Delete existing blocks
      const existing = await noteRepository.getBlocksByNote(note.id);
      for (const eb of existing) {
        await noteRepository.deleteBlock(eb.id);
      }

      // Create new blocks
      const created = [];
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i] as { type: BlockType; content: string; meta?: Record<string, unknown> };
        const block = await noteRepository.createBlock({
          noteId: note.id,
          type: b.type,
          content: b.content,
          meta: b.meta || {},
          position: i,
          parentId: null,
        });
        created.push(block);
      }

      await fullSave(container, note.id, broadcaster);
      broadcaster.broadcast('blocks:updated', { noteId: note.id });
      res.json(created);
    } catch (err) { next(err); }
  });

  // Update single block
  router.patch('/:blockId', async (req: Request<BlockParams>, res: Response, next: NextFunction) => {
    try {
      await resolveNote(container, req.params.id); // ensure note exists
      const { content, type, meta } = req.body;
      await noteRepository.updateBlock(req.params.blockId, { content, type, meta });
      await fullSave(container, req.params.id, broadcaster);
      broadcaster.broadcast('blocks:updated', { noteId: req.params.id });

      const blocks = await noteRepository.getBlocksByNote(req.params.id);
      const updated = blocks.find(b => b.id === req.params.blockId);
      res.json(updated);
    } catch (err) { next(err); }
  });

  // Delete single block
  router.delete('/:blockId', async (req: Request<BlockParams>, res: Response, next: NextFunction) => {
    try {
      const note = await resolveNote(container, req.params.id);
      await noteRepository.deleteBlock(req.params.blockId);

      // Reorder remaining blocks
      const remaining = await noteRepository.getBlocksByNote(note.id);
      await noteRepository.reorderBlocks(note.id, remaining.map(b => b.id));

      await fullSave(container, note.id, broadcaster);
      broadcaster.broadcast('blocks:updated', { noteId: note.id });
      res.json({ deleted: true, blockId: req.params.blockId });
    } catch (err) { next(err); }
  });

  return router;
}
