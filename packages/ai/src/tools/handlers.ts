import type { Container, Block, Note } from '@octonote/core';
import type { ToolResult } from '../types';

interface BlockInput {
  type: string;
  content: string;
  meta?: Record<string, unknown>;
}

/**
 * Resolve a note by ID or title.
 */
function resolveNote(container: Container, noteId: string): Note | undefined {
  return container.noteRepository.getNote(noteId)
    ?? container.noteRepository.getNoteByTitle(noteId);
}

/**
 * Run the full save cycle: vault file + search index + link sync.
 */
function fullSave(container: Container, noteId: string): void {
  const note = container.noteRepository.getNote(noteId);
  if (!note) return;
  container.vaultManager.saveNote(note, note.blocks || []);
  container.searchEngine.indexNote(note);
  container.linkGraph.syncLinks(noteId, note.blocks || []);
}

// ── Mutation Handlers ───────────────────────────────────

export function handleCreateNote(
  container: Container,
  input: { title: string; blocks: BlockInput[]; tags?: string[]; folderId?: string }
): ToolResult {
  try {
    const note = container.noteRepository.createNote(input.title, input.folderId);

    // Create blocks
    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      container.noteRepository.createBlock({
        noteId: note.id,
        type: b.type as Block['type'],
        content: b.content,
        meta: b.meta || {},
        position: i,
        parentId: null,
      });
    }

    // Add tags
    if (input.tags) {
      for (const tag of input.tags) {
        container.noteRepository.addTagToNote(note.id, tag);
      }
    }

    fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, title: note.title },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleAppendBlocks(
  container: Container,
  input: { noteId: string; blocks: BlockInput[] }
): ToolResult {
  try {
    const note = resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    const existing = container.noteRepository.getBlocksByNote(note.id);
    const startPos = existing.length;

    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      container.noteRepository.createBlock({
        noteId: note.id,
        type: b.type as Block['type'],
        content: b.content,
        meta: b.meta || {},
        position: startPos + i,
        parentId: null,
      });
    }

    fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blocksAdded: input.blocks.length },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleReplaceBlocks(
  container: Container,
  input: { noteId: string; blocks: BlockInput[] }
): ToolResult {
  try {
    const note = resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    // Delete all existing blocks
    const existing = container.noteRepository.getBlocksByNote(note.id);
    for (const block of existing) {
      container.noteRepository.deleteBlock(block.id);
    }

    // Create new blocks
    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      container.noteRepository.createBlock({
        noteId: note.id,
        type: b.type as Block['type'],
        content: b.content,
        meta: b.meta || {},
        position: i,
        parentId: null,
      });
    }

    fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blocksReplaced: input.blocks.length },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleTagNote(
  container: Container,
  input: { noteId: string; tags: string[] }
): ToolResult {
  try {
    const note = resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    for (const tag of input.tags) {
      container.noteRepository.addTagToNote(note.id, tag);
    }

    fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, tagsAdded: input.tags },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleRenameNote(
  container: Container,
  input: { noteId: string; newTitle: string }
): ToolResult {
  try {
    const note = resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    container.noteRepository.updateNote(note.id, { title: input.newTitle });
    fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, oldTitle: note.title, newTitle: input.newTitle },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleDeleteBlocks(
  container: Container,
  input: { noteId: string; blockIds: string[] }
): ToolResult {
  try {
    const note = resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    // Delete specified blocks
    for (const blockId of input.blockIds) {
      container.noteRepository.deleteBlock(blockId);
    }

    // Reorder remaining blocks
    const remaining = container.noteRepository.getBlocksByNote(note.id);
    const orderedIds = remaining.map(b => b.id);
    if (orderedIds.length > 0) {
      container.noteRepository.reorderBlocks(note.id, orderedIds);
    }

    fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blocksDeleted: input.blockIds.length },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Read Handlers ───────────────────────────────────────

export function handleSearchNotes(
  container: Container,
  input: { query: string; limit?: number }
): ToolResult {
  try {
    // Rebuild index to ensure fresh results
    const allNotes = container.noteRepository.listNotes();
    const fullNotes = allNotes.map(n => container.noteRepository.getNote(n.id)!).filter(Boolean);
    container.searchEngine.rebuildIndex(fullNotes);

    const results = container.searchEngine.search(input.query, { limit: input.limit || 10 });
    return {
      success: true,
      data: results,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleGetNote(
  container: Container,
  input: { noteId: string }
): ToolResult {
  try {
    const note = resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    return {
      success: true,
      data: {
        id: note.id,
        title: note.title,
        folderId: note.folderId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tags: (note.tags || []).map(t => t.name),
        blocks: (note.blocks || []).map(b => ({
          id: b.id,
          type: b.type,
          content: b.content,
          meta: b.meta,
          position: b.position,
        })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleListTags(container: Container): ToolResult {
  try {
    const tags = container.noteRepository.listTags();
    return {
      success: true,
      data: tags.map(t => t.name),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleListFolders(container: Container): ToolResult {
  try {
    const folders = container.noteRepository.listFolders();
    return {
      success: true,
      data: folders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
