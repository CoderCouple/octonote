import type { Container, Note, Block } from '@octonote/core';

/**
 * Full save cycle: update DB blocks → save vault file → reindex search → sync links.
 */
export function saveNote(container: Container, note: Note, blocks: Block[]): void {
  const { noteRepository, vaultManager, searchEngine, linkGraph } = container;

  // Update blocks in DB
  const existingBlocks = noteRepository.getBlocksByNote(note.id);
  const existingIds = new Set(existingBlocks.map(b => b.id));
  const newIds = new Set(blocks.map(b => b.id));

  // Delete removed blocks
  for (const eb of existingBlocks) {
    if (!newIds.has(eb.id)) {
      noteRepository.deleteBlock(eb.id);
    }
  }

  // Upsert blocks
  for (const block of blocks) {
    if (existingIds.has(block.id)) {
      noteRepository.updateBlock(block.id, {
        type: block.type,
        content: block.content,
        meta: block.meta,
        position: block.position,
      });
    } else {
      noteRepository.createBlock({
        noteId: note.id,
        type: block.type,
        content: block.content,
        meta: block.meta,
        position: block.position,
        parentId: block.parentId,
      });
    }
  }

  // Refresh note from DB (gets updated blocks + tags)
  const freshNote = noteRepository.getNote(note.id);
  if (freshNote) {
    // Save vault file
    vaultManager.saveNote(freshNote, freshNote.blocks || []);

    // Reindex for search
    searchEngine.indexNote(freshNote);

    // Sync wikilinks
    linkGraph.syncLinks(note.id, freshNote.blocks || []);
  }
}
