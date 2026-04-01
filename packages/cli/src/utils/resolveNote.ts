import type { Container, Note } from '@octonote/core';

/**
 * Look up a note by ID first, then by title. Exits with error if not found.
 */
export function resolveNote(container: Container, titleOrId: string): Note {
  // Try by ID first
  let note = container.noteRepository.getNote(titleOrId);
  if (note) return note;

  // Try by title
  note = container.noteRepository.getNoteByTitle(titleOrId);
  if (note) return note;

  console.error(`Note not found: "${titleOrId}"`);
  process.exit(1);
}
