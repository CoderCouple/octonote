// Re-define types locally to avoid CJS/ESM dependency issues with @octonote/core

export enum BlockType {
  Paragraph = 'paragraph',
  Heading = 'heading',
  Bullet = 'bullet',
  Numbered = 'numbered',
  Todo = 'todo',
  Code = 'code',
  Quote = 'quote',
  Callout = 'callout',
  Divider = 'divider',
  Image = 'image',
  Embed = 'embed',
  Table = 'table',
  Diagram = 'diagram',
}

export interface Block {
  id: string;
  noteId: string;
  type: BlockType;
  content: string;
  meta: Record<string, unknown>;
  position: number;
  parentId: string | null;
}

export interface Note {
  id: string;
  title: string;
  folderId: string | null;
  storageFmt: 'json' | 'markdown';
  createdAt: string;
  updatedAt: string;
  blocks?: Block[];
  tags?: Tag[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Link {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  sourceBlockId: string | null;
  alias: string | null;
}

export interface DailyNote {
  date: string;
  noteId: string;
}

export interface SearchResult {
  id: string;
  title: string;
  score: number;
  snippet: string;
  tags: string[];
}

export interface DayInfo {
  date: string;
  hasNote: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  title: string;
  linkCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface AiResult {
  response: string;
  affectedNotes: string[];
  sources: string[];
}
