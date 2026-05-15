import type { Container, Note, Project } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import type { ApiError } from '../middleware/errors';

/**
 * Resolve a note by ID or title. Throws 404 if not found.
 */
export async function resolveNote(container: Container, idOrTitle: string): Promise<Note> {
  let note = await container.noteRepository.getNote(idOrTitle);
  if (!note) {
    note = await container.noteRepository.getNoteByTitle(idOrTitle);
  }
  if (!note) {
    const err: ApiError = new Error(`Note not found: ${idOrTitle}`);
    err.status = 404;
    throw err;
  }
  return note;
}

/**
 * Resolve a project by ID or slug. Throws 404 if not found.
 */
export async function resolveProject(container: Container, idOrSlug: string): Promise<Project> {
  let project = await container.noteRepository.getProject(idOrSlug);
  if (!project) {
    project = await container.noteRepository.getProjectBySlug(idOrSlug);
  }
  if (!project) {
    const err: ApiError = new Error(`Project not found: ${idOrSlug}`);
    err.status = 404;
    throw err;
  }
  return project;
}

/**
 * Full save cycle: update DB blocks -> vault file -> search index -> link graph -> broadcast.
 */
export async function fullSave(container: Container, noteId: string, broadcaster: Broadcaster): Promise<void> {
  const { noteRepository, vaultManager, searchEngine, linkGraph } = container;

  const note = await noteRepository.getNote(noteId);
  if (!note) return;

  // Save vault file
  vaultManager.saveNote(note, note.blocks || []);

  // Reindex for search
  searchEngine.indexNote(note);

  // Sync wikilinks
  await linkGraph.syncLinks(noteId, note.blocks || []);

  // Broadcast update
  broadcaster.broadcast('note:updated', { noteId, title: note.title });
}
