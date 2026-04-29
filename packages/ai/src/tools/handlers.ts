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

// ── Diagram Handlers ────────────────────────────────────

export function handleGenerateDiagram(
  container: Container,
  input: { mermaidSyntax: string; diagramType: string; noteId?: string; noteTitle?: string }
): ToolResult {
  try {
    let noteId: string;

    if (input.noteId) {
      const note = resolveNote(container, input.noteId);
      if (!note) return { success: false, error: `Note not found: ${input.noteId}` };
      noteId = note.id;
    } else {
      const title = input.noteTitle || `Diagram: ${input.diagramType}`;
      const note = container.noteRepository.createNote(title);
      noteId = note.id;
    }

    const existing = container.noteRepository.getBlocksByNote(noteId);
    const position = existing.length;

    const block = container.noteRepository.createBlock({
      noteId,
      type: 'diagram' as Block['type'],
      content: input.mermaidSyntax,
      meta: { diagramType: input.diagramType, syntax: 'mermaid' },
      position,
      parentId: null,
    });

    fullSave(container, noteId);

    return {
      success: true,
      data: { noteId, blockId: block.id, diagramType: input.diagramType },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleUpdateDiagram(
  container: Container,
  input: { noteId: string; blockId: string; mermaidSyntax: string }
): ToolResult {
  try {
    const note = resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    const blocks = container.noteRepository.getBlocksByNote(note.id);
    const block = blocks.find(b => b.id === input.blockId);
    if (!block) return { success: false, error: `Block not found: ${input.blockId}` };
    if (block.type !== ('diagram' as Block['type'])) {
      return { success: false, error: `Block ${input.blockId} is not a diagram block` };
    }

    container.noteRepository.updateBlock(input.blockId, {
      content: input.mermaidSyntax,
    });

    fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blockId: input.blockId },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Synthesis Handlers (NotebookLM-style) ───────────────

export function handleGetNotesContent(
  container: Container,
  input: { noteIds: string[] }
): ToolResult {
  try {
    const notes: unknown[] = [];

    for (const noteRef of input.noteIds) {
      const note = resolveNote(container, noteRef);
      if (!note) {
        notes.push({ id: noteRef, error: `Note not found: ${noteRef}` });
        continue;
      }

      const tags = container.noteRepository.getNoteTags(note.id);
      notes.push({
        id: note.id,
        title: note.title,
        folderId: note.folderId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tags: tags.map(t => t.name),
        blocks: (note.blocks || []).map(b => ({
          id: b.id,
          type: b.type,
          content: b.content,
          meta: b.meta,
          position: b.position,
        })),
      });
    }

    return { success: true, data: notes };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleSummarizeNotes(
  container: Container,
  input: {
    noteIds: string[];
    summaryTitle: string;
    blocks: BlockInput[];
    tags?: string[];
  }
): ToolResult {
  try {
    // Create the summary note
    const summaryNote = container.noteRepository.createNote(input.summaryTitle);

    // Create blocks
    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      container.noteRepository.createBlock({
        noteId: summaryNote.id,
        type: b.type as Block['type'],
        content: b.content,
        meta: b.meta || {},
        position: i,
        parentId: null,
      });
    }

    // Add ai-summary tag + custom tags
    container.noteRepository.addTagToNote(summaryNote.id, 'ai-summary');
    if (input.tags) {
      for (const tag of input.tags) {
        container.noteRepository.addTagToNote(summaryNote.id, tag);
      }
    }

    // Resolve source notes for metadata
    const sourceNotes: string[] = [];
    for (const noteRef of input.noteIds) {
      const note = resolveNote(container, noteRef);
      if (note) sourceNotes.push(note.title);
    }

    fullSave(container, summaryNote.id);

    return {
      success: true,
      data: {
        noteId: summaryNote.id,
        title: summaryNote.title,
        sourceNotes,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function handleAutoTag(
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
