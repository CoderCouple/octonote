import { Router } from 'express';
import type { Container } from '@octonote/core';
import { AiService, resolveApiKey } from '@octonote/ai';
import type { Broadcaster } from '../ws/broadcaster';
import { fullSave } from './helpers';

export function aiRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();

  // Non-streaming AI request
  router.post('/', async (req, res, next) => {
    try {
      const apiKey = resolveApiKey(container);
      const service = new AiService(container, apiKey);
      const { prompt, model } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'prompt is required', status: 400 });
        return;
      }

      const result = await service.run(prompt, { stream: false, model });

      // Trigger fullSave for any affected notes
      for (const noteId of result.affectedNotes) {
        await fullSave(container, noteId, broadcaster);
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // SSE streaming AI request
  router.post('/stream', async (req, res, next) => {
    try {
      const apiKey = resolveApiKey(container);
      const service = new AiService(container, apiKey);
      const { prompt, model } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'prompt is required', status: 400 });
        return;
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const result = await service.run(prompt, {
        stream: true,
        model,
        onStream: (text: string) => {
          res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
        },
      });

      // Trigger fullSave for any affected notes
      for (const noteId of result.affectedNotes) {
        await fullSave(container, noteId, broadcaster);
      }

      // Send final result
      res.write(`data: ${JSON.stringify({ type: 'done', result })}\n\n`);
      res.end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
