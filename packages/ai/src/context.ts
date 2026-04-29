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

  // Content previews — first ~500 chars of 5 most recent notes
  const contentPreviews: string[] = [];
  for (const n of recentNotes.slice(0, 5)) {
    const fullNote = noteRepository.getNote(n.id);
    if (fullNote?.blocks?.length) {
      const textContent = fullNote.blocks
        .map(b => b.content)
        .join(' ')
        .slice(0, 500);
      contentPreviews.push(`- "${n.title}": ${textContent}${textContent.length >= 500 ? '...' : ''}`);
    }
  }

  // All tags with tag clusters
  const allTags = noteRepository.listTags();
  const tagList = allTags.map(t => t.name).join(', ');

  // Tag clusters — group notes by tag
  const tagClusters: string[] = [];
  for (const tag of allTags.slice(0, 15)) {
    const taggedNotes = notes.filter(n => {
      const noteTags = noteRepository.getNoteTags(n.id);
      return noteTags.some(t => t.name === tag.name);
    });
    if (taggedNotes.length > 0) {
      const titles = taggedNotes.slice(0, 5).map(n => `"${n.title}"`).join(', ');
      tagClusters.push(`- #${tag.name}: ${titles}${taggedNotes.length > 5 ? ` (+${taggedNotes.length - 5} more)` : ''}`);
    }
  }

  // All folders
  const allFolders = noteRepository.listFolders();
  const folderList = allFolders.map(f => f.name).join(', ');

  // Link graph summary
  const graph = linkGraph.getGraphData();
  const orphans = linkGraph.getOrphans();

  // Hub notes — top 5 most-connected notes by link count
  const linkCounts = new Map<string, number>();
  for (const edge of graph.edges) {
    linkCounts.set(edge.source, (linkCounts.get(edge.source) || 0) + 1);
    linkCounts.set(edge.target, (linkCounts.get(edge.target) || 0) + 1);
  }
  const hubNotes = [...graph.nodes]
    .map(n => ({ ...n, linkCount: linkCounts.get(n.id) || 0 }))
    .sort((a, b) => b.linkCount - a.linkCount)
    .slice(0, 5)
    .filter(n => n.linkCount > 0)
    .map(n => `- "${n.title}" (${n.linkCount} links)`);

  const sections = [
    `You are an AI assistant for OctoNote, a block-based note-taking app.`,
    `You help users create, edit, search, synthesize, and organize their notes using the provided tools.`,
    `You can also generate diagrams using Mermaid syntax and create summaries across multiple notes.`,
    '',
    `## Vault Context`,
    '',
    `### Recent Notes (${notes.length} total)`,
    noteSummaries.length > 0 ? noteSummaries.join('\n') : '(empty vault)',
    '',
    ...(contentPreviews.length > 0 ? [
      `### Content Previews`,
      contentPreviews.join('\n'),
      '',
    ] : []),
    `### Tags`,
    tagList || '(none)',
    '',
    ...(tagClusters.length > 0 ? [
      `### Tag Clusters`,
      tagClusters.join('\n'),
      '',
    ] : []),
    `### Folders`,
    folderList || '(none)',
    '',
    `### Link Graph`,
    `- ${graph.nodes.length} notes, ${graph.edges.length} links`,
    `- ${orphans.length} orphan notes (no links)`,
    ...(hubNotes.length > 0 ? [
      '',
      `### Hub Notes (most connected)`,
      hubNotes.join('\n'),
    ] : []),
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
    `- diagram: Mermaid diagram in content, meta.diagramType (flowchart, sequence, er, etc.), meta.syntax = "mermaid"`,
    '',
    `## Diagram Instructions`,
    `When generating diagrams, use the generate_diagram tool with valid Mermaid syntax.`,
    `Supported diagram types: flowchart, sequence, er, gantt, class, state, pie, mindmap, timeline, gitgraph.`,
    `Example flowchart:`,
    '```',
    `graph TD`,
    `  A[Start] --> B{Decision}`,
    `  B -->|Yes| C[Action]`,
    `  B -->|No| D[End]`,
    '```',
    '',
    `## Source Citation Instructions`,
    `When referencing or synthesizing content from existing notes, ALWAYS use [[Note Title]] wikilinks.`,
    `When summarizing multiple notes, use the summarize_notes tool and include wikilink citations in the summary blocks.`,
    `Use get_notes_content to read multiple notes at once for cross-note synthesis.`,
    '',
    `## Instructions`,
    `- Use read tools (search_notes, get_note, get_notes_content, list_tags, list_folders) to understand the vault before making changes.`,
    `- When creating notes, include meaningful tags for organization.`,
    `- Use wikilinks ([[Note Title]]) in content to link between notes.`,
    `- Prefer appending to existing notes over creating duplicates.`,
    `- When the user asks to "summarize" or "organize", read relevant notes first using get_notes_content.`,
    `- When auto-tagging, analyze the full content and apply specific, descriptive tags.`,
    `- Always confirm destructive actions by describing what you'll do before doing it.`,
  ];

  return sections.join('\n');
}
