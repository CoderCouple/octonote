import type Anthropic from '@anthropic-ai/sdk';

type Tool = Anthropic.Messages.Tool;

export const TOOL_DEFINITIONS: Tool[] = [
  // ── Mutation Tools ────────────────────────────────────

  {
    name: 'create_note',
    description: 'Create a new note with blocks and optional tags. Returns the created note ID and title.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Note title' },
        blocks: {
          type: 'array',
          description: 'Array of blocks to add to the note',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['paragraph', 'heading', 'bullet', 'numbered', 'todo', 'code', 'quote', 'callout', 'divider', 'image', 'embed', 'table', 'diagram'],
                description: 'Block type',
              },
              content: { type: 'string', description: 'Block content' },
              meta: {
                type: 'object',
                description: 'Block metadata (e.g. level for heading, lang for code, checked for todo)',
              },
            },
            required: ['type', 'content'],
          },
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add to the note',
        },
        folderId: { type: 'string', description: 'Optional folder ID to place the note in' },
      },
      required: ['title', 'blocks'],
    },
  },

  {
    name: 'append_blocks',
    description: 'Append blocks to the end of an existing note. Identify the note by ID or title.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID (preferred) or title' },
        blocks: {
          type: 'array',
          description: 'Blocks to append',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['paragraph', 'heading', 'bullet', 'numbered', 'todo', 'code', 'quote', 'callout', 'divider', 'image', 'embed', 'table', 'diagram'],
              },
              content: { type: 'string' },
              meta: { type: 'object' },
            },
            required: ['type', 'content'],
          },
        },
      },
      required: ['noteId', 'blocks'],
    },
  },

  {
    name: 'replace_blocks',
    description: 'Replace ALL blocks in a note with new blocks. Use this for full rewrites. Identify the note by ID or title.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID (preferred) or title' },
        blocks: {
          type: 'array',
          description: 'New blocks to replace existing ones',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['paragraph', 'heading', 'bullet', 'numbered', 'todo', 'code', 'quote', 'callout', 'divider', 'image', 'embed', 'table', 'diagram'],
              },
              content: { type: 'string' },
              meta: { type: 'object' },
            },
            required: ['type', 'content'],
          },
        },
      },
      required: ['noteId', 'blocks'],
    },
  },

  {
    name: 'tag_note',
    description: 'Add one or more tags to a note. Identify the note by ID or title.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID (preferred) or title' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add',
        },
      },
      required: ['noteId', 'tags'],
    },
  },

  {
    name: 'rename_note',
    description: 'Rename a note. Identify the note by ID or title.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID (preferred) or current title' },
        newTitle: { type: 'string', description: 'New title for the note' },
      },
      required: ['noteId', 'newTitle'],
    },
  },

  {
    name: 'delete_blocks',
    description: 'Delete specific blocks from a note by their block IDs. Remaining blocks are reordered.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID (preferred) or title' },
        blockIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of blocks to delete',
        },
      },
      required: ['noteId', 'blockIds'],
    },
  },

  // ── Read Tools ────────────────────────────────────────

  {
    name: 'search_notes',
    description: 'Search notes by keyword query. Returns matching notes with scores and snippets.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },

  {
    name: 'get_note',
    description: 'Get a note by ID or title. Returns full content including blocks, tags, and metadata.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID or title' },
      },
      required: ['noteId'],
    },
  },

  {
    name: 'list_tags',
    description: 'List all tags in the vault.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'list_folders',
    description: 'List all folders in the vault.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── Diagram Tools ──────────────────────────────────

  {
    name: 'generate_diagram',
    description: 'Create a diagram block using Mermaid syntax. Optionally add it to an existing note or create a new note.',
    input_schema: {
      type: 'object' as const,
      properties: {
        mermaidSyntax: { type: 'string', description: 'Valid Mermaid diagram syntax' },
        diagramType: {
          type: 'string',
          enum: ['flowchart', 'sequence', 'er', 'gantt', 'class', 'state', 'pie', 'mindmap', 'timeline', 'gitgraph'],
          description: 'Type of diagram',
        },
        noteId: { type: 'string', description: 'Existing note ID or title to append the diagram to' },
        noteTitle: { type: 'string', description: 'Title for a new note (used if noteId is not provided)' },
      },
      required: ['mermaidSyntax', 'diagramType'],
    },
  },

  {
    name: 'update_diagram',
    description: 'Update an existing diagram block with new Mermaid syntax.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID or title containing the diagram' },
        blockId: { type: 'string', description: 'Block ID of the diagram to update' },
        mermaidSyntax: { type: 'string', description: 'New Mermaid syntax' },
      },
      required: ['noteId', 'blockId', 'mermaidSyntax'],
    },
  },

  // ── Synthesis Tools (NotebookLM-style) ─────────────

  {
    name: 'get_notes_content',
    description: 'Read the full content of multiple notes at once. Returns blocks, tags, and metadata for each note.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Note IDs or titles to read',
        },
      },
      required: ['noteIds'],
    },
  },

  {
    name: 'summarize_notes',
    description: 'Create a summary note that synthesizes content from multiple source notes. Automatically adds wikilink citations and ai-summary tag.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Source note IDs or titles to summarize',
        },
        summaryTitle: { type: 'string', description: 'Title for the summary note' },
        blocks: {
          type: 'array',
          description: 'Blocks for the summary note',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['paragraph', 'heading', 'bullet', 'numbered', 'todo', 'code', 'quote', 'callout', 'divider', 'image', 'embed', 'table', 'diagram'],
              },
              content: { type: 'string' },
              meta: { type: 'object' },
            },
            required: ['type', 'content'],
          },
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional tags for the summary note',
        },
      },
      required: ['noteIds', 'summaryTitle', 'blocks'],
    },
  },

  {
    name: 'auto_tag',
    description: 'Analyze a note\'s content and apply semantically relevant tags. The AI determines which tags best describe the content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: { type: 'string', description: 'Note ID or title to tag' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to apply based on content analysis',
        },
      },
      required: ['noteId', 'tags'],
    },
  },
];
