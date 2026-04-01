import type { Container, Note, Block } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import type { ApiError } from '../middleware/errors';

/**
 * Resolve a note by ID or title. Throws 404 if not found.
 */
export function resolveNote(container: Container, idOrTitle: string): Note {
  let note = container.noteRepository.getNote(idOrTitle);
  if (!note) {
    note = container.noteRepository.getNoteByTitle(idOrTitle);
  }
  if (!note) {
    const err: ApiError = new Error(`Note not found: ${idOrTitle}`);
    err.status = 404;
    throw err;
  }
  return note;
}

/**
 * Full save cycle: update DB blocks -> vault file -> search index -> link graph -> broadcast.
 */
export function fullSave(container: Container, noteId: string, broadcaster: Broadcaster): void {
  const { noteRepository, vaultManager, searchEngine, linkGraph } = container;

  const note = noteRepository.getNote(noteId);
  if (!note) return;

  // Save vault file
  vaultManager.saveNote(note, note.blocks || []);

  // Reindex for search
  searchEngine.indexNote(note);

  // Sync wikilinks
  linkGraph.syncLinks(noteId, note.blocks || []);

  // Broadcast update
  broadcaster.broadcast('note:updated', { noteId, title: note.title });
}
