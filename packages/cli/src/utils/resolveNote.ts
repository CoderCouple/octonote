import type { Container, Note } from '@octonote/core';

/**
 * Look up a note by ID first, then by title. Exits with error if not found.
 */
export async function resolveNote(container: Container, titleOrId: string): Promise<Note> {
  // Try by ID first
  let note = await container.noteRepository.getNote(titleOrId);
  if (note) return note;

  // Try by title
  note = await container.noteRepository.getNoteByTitle(titleOrId);
  if (note) return note;

  console.error(`Note not found: "${titleOrId}"`);
  process.exit(1);
}
