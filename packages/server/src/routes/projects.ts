import { Router } from 'express';
import type { Container } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveProject } from './helpers';

export function projectsRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();
  const { noteRepository } = container;

  // List all projects
  router.get('/', async (_req, res, next) => {
    try {
      res.json(await noteRepository.listProjects());
    } catch (err) { next(err); }
  });

  // Get a project (by id or slug) with its notes
  router.get('/:id', async (req, res, next) => {
    try {
      const project = await resolveProject(container, req.params.id);
      const notes = await noteRepository.listNotes({ projectId: project.id });
      res.json({ ...project, notes });
    } catch (err) { next(err); }
  });

  // Create project
  router.post('/', async (req, res, next) => {
    try {
      const { name, slug, description, repo, status } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name is required', status: 400 });
        return;
      }
      const project = await noteRepository.createProject(name, { slug, description, repo, status });
      broadcaster.broadcast('project:created', { projectId: project.id, name: project.name });
      res.status(201).json(project);
    } catch (err) { next(err); }
  });

  // Update project
  router.patch('/:id', async (req, res, next) => {
    try {
      const project = await resolveProject(container, req.params.id);
      const { name, slug, description, repo, status } = req.body;
      await noteRepository.updateProject(project.id, { name, slug, description, repo, status });
      broadcaster.broadcast('project:updated', { projectId: project.id });
      res.json(await noteRepository.getProject(project.id));
    } catch (err) { next(err); }
  });

  // Delete project (notes are kept; their project_id is set to null)
  router.delete('/:id', async (req, res, next) => {
    try {
      const project = await resolveProject(container, req.params.id);
      await noteRepository.deleteProject(project.id);
      broadcaster.broadcast('project:deleted', { projectId: project.id });
      res.json({ deleted: true, projectId: project.id });
    } catch (err) { next(err); }
  });

  return router;
}
