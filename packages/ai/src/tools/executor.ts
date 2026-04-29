import type { Container } from '@octonote/core';
import type { ToolResult } from '../types';
import {
  handleCreateNote,
  handleAppendBlocks,
  handleReplaceBlocks,
  handleTagNote,
  handleRenameNote,
  handleDeleteBlocks,
  handleSearchNotes,
  handleGetNote,
  handleListTags,
  handleListFolders,
  handleGenerateDiagram,
  handleUpdateDiagram,
  handleGetNotesContent,
  handleSummarizeNotes,
  handleAutoTag,
} from './handlers';

/**
 * Dispatch a tool call to the appropriate handler.
 */
export function executeTool(
  container: Container,
  toolName: string,
  input: Record<string, unknown>
): ToolResult {
  switch (toolName) {
    case 'create_note':
      return handleCreateNote(container, input as any);
    case 'append_blocks':
      return handleAppendBlocks(container, input as any);
    case 'replace_blocks':
      return handleReplaceBlocks(container, input as any);
    case 'tag_note':
      return handleTagNote(container, input as any);
    case 'rename_note':
      return handleRenameNote(container, input as any);
    case 'delete_blocks':
      return handleDeleteBlocks(container, input as any);
    case 'search_notes':
      return handleSearchNotes(container, input as any);
    case 'get_note':
      return handleGetNote(container, input as any);
    case 'list_tags':
      return handleListTags(container);
    case 'list_folders':
      return handleListFolders(container);
    case 'generate_diagram':
      return handleGenerateDiagram(container, input as any);
    case 'update_diagram':
      return handleUpdateDiagram(container, input as any);
    case 'get_notes_content':
      return handleGetNotesContent(container, input as any);
    case 'summarize_notes':
      return handleSummarizeNotes(container, input as any);
    case 'auto_tag':
      return handleAutoTag(container, input as any);
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
