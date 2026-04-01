import type { Container } from '@octonote/core';

/**
 * Build a system prompt with vault context for Claude.
 */
export function buildSystemPrompt(container: Container): string {
  const { noteRepository, linkGraph } = container;

  // Recent notes (up to 20)
  const notes = noteRepository.listNotes();
  const recentNotes = notes.slice(0, 20);
  const noteSummaries = recentNotes.map(n => {
    const tags = noteRepository.getNoteTags(n.id);
    const tagStr = tags.length ? ` [${tags.map(t => t.name).join(', ')}]` : '';
    return `- "${n.title}"${tagStr} (updated: ${n.updatedAt.split('T')[0]})`;
  });

  // All tags
  const allTags = noteRepository.listTags();
  const tagList = allTags.map(t => t.name).join(', ');

  // All folders
  const allFolders = noteRepository.listFolders();
  const folderList = allFolders.map(f => f.name).join(', ');

  // Link graph summary
  const graph = linkGraph.getGraphData();
  const orphans = linkGraph.getOrphans();

  const sections = [
    `You are an AI assistant for OctoNote, a block-based note-taking app.`,
    `You help users create, edit, search, and organize their notes using the provided tools.`,
    '',
    `## Vault Context`,
    '',
    `### Recent Notes (${notes.length} total)`,
    noteSummaries.length > 0 ? noteSummaries.join('\n') : '(empty vault)',
    '',
    `### Tags`,
    tagList || '(none)',
    '',
    `### Folders`,
    folderList || '(none)',
    '',
    `### Link Graph`,
    `- ${graph.nodes.length} notes, ${graph.edges.length} links`,
    `- ${orphans.length} orphan notes (no links)`,
    '',
    `## Block Types Reference`,
    `When creating or editing notes, use these block types:`,
    `- paragraph: Plain text`,
    `- heading: Heading with level (1-3) in meta.level`,
    `- bullet: Unordered list item`,
    `- numbered: Ordered list item`,
    `- todo: Checkbox item with meta.checked (true/false)`,
    `- code: Code block with meta.lang`,
    `- quote: Blockquote`,
    `- callout: Callout with meta.calloutType (info, warning, tip, etc.)`,
    `- divider: Horizontal rule (content is empty)`,
    `- image: Image URL in content, meta.alt for alt text`,
    `- embed: Wikilink embed, target note title in content`,
    `- table: JSON array of rows in content, e.g. [["Header1","Header2"],["Cell1","Cell2"]]`,
    '',
    `## Instructions`,
    `- Use read tools (search_notes, get_note, list_tags, list_folders) to understand the vault before making changes.`,
    `- When creating notes, include meaningful tags for organization.`,
    `- Use wikilinks ([[Note Title]]) in content to link between notes.`,
    `- Prefer appending to existing notes over creating duplicates.`,
    `- When the user asks to "summarize" or "organize", read relevant notes first.`,
    `- Always confirm destructive actions by describing what you'll do before doing it.`,
  ];

  return sections.join('\n');
}
