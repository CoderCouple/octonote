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
async function resolveNote(container: Container, noteId: string): Promise<Note | undefined> {
  return (await container.noteRepository.getNote(noteId))
    ?? (await container.noteRepository.getNoteByTitle(noteId));
}

/**
 * Run the full save cycle: vault file + search index + link sync.
 */
async function fullSave(container: Container, noteId: string): Promise<void> {
  const note = await container.noteRepository.getNote(noteId);
  if (!note) return;
  container.vaultManager.saveNote(note, note.blocks || []);
  container.searchEngine.indexNote(note);
  await container.linkGraph.syncLinks(noteId, note.blocks || []);
}

// ── Mutation Handlers ───────────────────────────────────

export async function handleCreateNote(
  container: Container,
  input: { title: string; blocks: BlockInput[]; tags?: string[]; folderId?: string }
): Promise<ToolResult> {
  try {
    const note = await container.noteRepository.createNote(input.title, input.folderId);

    // Create blocks
    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      await container.noteRepository.createBlock({
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
        await container.noteRepository.addTagToNote(note.id, tag);
      }
    }

    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, title: note.title },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleAppendBlocks(
  container: Container,
  input: { noteId: string; blocks: BlockInput[] }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    const existing = await container.noteRepository.getBlocksByNote(note.id);
    const startPos = existing.length;

    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      await container.noteRepository.createBlock({
        noteId: note.id,
        type: b.type as Block['type'],
        content: b.content,
        meta: b.meta || {},
        position: startPos + i,
        parentId: null,
      });
    }

    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blocksAdded: input.blocks.length },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleReplaceBlocks(
  container: Container,
  input: { noteId: string; blocks: BlockInput[] }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    // Delete all existing blocks
    const existing = await container.noteRepository.getBlocksByNote(note.id);
    for (const block of existing) {
      await container.noteRepository.deleteBlock(block.id);
    }

    // Create new blocks
    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      await container.noteRepository.createBlock({
        noteId: note.id,
        type: b.type as Block['type'],
        content: b.content,
        meta: b.meta || {},
        position: i,
        parentId: null,
      });
    }

    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blocksReplaced: input.blocks.length },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleTagNote(
  container: Container,
  input: { noteId: string; tags: string[] }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    for (const tag of input.tags) {
      await container.noteRepository.addTagToNote(note.id, tag);
    }

    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, tagsAdded: input.tags },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleRenameNote(
  container: Container,
  input: { noteId: string; newTitle: string }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    await container.noteRepository.updateNote(note.id, { title: input.newTitle });
    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, oldTitle: note.title, newTitle: input.newTitle },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleDeleteBlocks(
  container: Container,
  input: { noteId: string; blockIds: string[] }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    // Delete specified blocks
    for (const blockId of input.blockIds) {
      await container.noteRepository.deleteBlock(blockId);
    }

    // Reorder remaining blocks
    const remaining = await container.noteRepository.getBlocksByNote(note.id);
    const orderedIds = remaining.map(b => b.id);
    if (orderedIds.length > 0) {
      await container.noteRepository.reorderBlocks(note.id, orderedIds);
    }

    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blocksDeleted: input.blockIds.length },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Read Handlers ───────────────────────────────────────

export async function handleSearchNotes(
  container: Container,
  input: { query: string; limit?: number }
): Promise<ToolResult> {
  try {
    // Rebuild index to ensure fresh results
    const allNotes = await container.noteRepository.listNotes();
    const fullNotes = [];
    for (const n of allNotes) {
      const full = await container.noteRepository.getNote(n.id);
      if (full) fullNotes.push(full);
    }
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

export async function handleGetNote(
  container: Container,
  input: { noteId: string }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
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

export async function handleListTags(container: Container): Promise<ToolResult> {
  try {
    const tags = await container.noteRepository.listTags();
    return {
      success: true,
      data: tags.map(t => t.name),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleListFolders(container: Container): Promise<ToolResult> {
  try {
    const folders = await container.noteRepository.listFolders();
    return {
      success: true,
      data: folders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Diagram Handlers ────────────────────────────────────

export async function handleGenerateDiagram(
  container: Container,
  input: { mermaidSyntax: string; diagramType: string; noteId?: string; noteTitle?: string }
): Promise<ToolResult> {
  try {
    let noteId: string;

    if (input.noteId) {
      const note = await resolveNote(container, input.noteId);
      if (!note) return { success: false, error: `Note not found: ${input.noteId}` };
      noteId = note.id;
    } else {
      const title = input.noteTitle || `Diagram: ${input.diagramType}`;
      const note = await container.noteRepository.createNote(title);
      noteId = note.id;
    }

    const existing = await container.noteRepository.getBlocksByNote(noteId);
    const position = existing.length;

    const block = await container.noteRepository.createBlock({
      noteId,
      type: 'diagram' as Block['type'],
      content: input.mermaidSyntax,
      meta: { diagramType: input.diagramType, syntax: 'mermaid' },
      position,
      parentId: null,
    });

    await fullSave(container, noteId);

    return {
      success: true,
      data: { noteId, blockId: block.id, diagramType: input.diagramType },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleUpdateDiagram(
  container: Container,
  input: { noteId: string; blockId: string; mermaidSyntax: string }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    const blocks = await container.noteRepository.getBlocksByNote(note.id);
    const block = blocks.find(b => b.id === input.blockId);
    if (!block) return { success: false, error: `Block not found: ${input.blockId}` };
    if (block.type !== ('diagram' as Block['type'])) {
      return { success: false, error: `Block ${input.blockId} is not a diagram block` };
    }

    await container.noteRepository.updateBlock(input.blockId, {
      content: input.mermaidSyntax,
    });

    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, blockId: input.blockId },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Synthesis Handlers (NotebookLM-style) ───────────────

export async function handleGetNotesContent(
  container: Container,
  input: { noteIds: string[] }
): Promise<ToolResult> {
  try {
    const notes: unknown[] = [];

    for (const noteRef of input.noteIds) {
      const note = await resolveNote(container, noteRef);
      if (!note) {
        notes.push({ id: noteRef, error: `Note not found: ${noteRef}` });
        continue;
      }

      const tags = await container.noteRepository.getNoteTags(note.id);
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

export async function handleSummarizeNotes(
  container: Container,
  input: {
    noteIds: string[];
    summaryTitle: string;
    blocks: BlockInput[];
    tags?: string[];
  }
): Promise<ToolResult> {
  try {
    // Create the summary note
    const summaryNote = await container.noteRepository.createNote(input.summaryTitle);

    // Create blocks
    for (let i = 0; i < input.blocks.length; i++) {
      const b = input.blocks[i];
      await container.noteRepository.createBlock({
        noteId: summaryNote.id,
        type: b.type as Block['type'],
        content: b.content,
        meta: b.meta || {},
        position: i,
        parentId: null,
      });
    }

    // Add ai-summary tag + custom tags
    await container.noteRepository.addTagToNote(summaryNote.id, 'ai-summary');
    if (input.tags) {
      for (const tag of input.tags) {
        await container.noteRepository.addTagToNote(summaryNote.id, tag);
      }
    }

    // Resolve source notes for metadata
    const sourceNotes: string[] = [];
    for (const noteRef of input.noteIds) {
      const note = await resolveNote(container, noteRef);
      if (note) sourceNotes.push(note.title);
    }

    await fullSave(container, summaryNote.id);

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

export async function handleAutoTag(
  container: Container,
  input: { noteId: string; tags: string[] }
): Promise<ToolResult> {
  try {
    const note = await resolveNote(container, input.noteId);
    if (!note) return { success: false, error: `Note not found: ${input.noteId}` };

    for (const tag of input.tags) {
      await container.noteRepository.addTagToNote(note.id, tag);
    }

    await fullSave(container, note.id);

    return {
      success: true,
      data: { noteId: note.id, tagsAdded: input.tags },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
