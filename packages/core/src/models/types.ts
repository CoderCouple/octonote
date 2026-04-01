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
  storageFmt: StorageFormat;
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

export type StorageFormat = 'json' | 'markdown';

export interface VaultConfig {
  vaultPath: string;
  storageFmt: StorageFormat;
  anthropicApiKey?: string;
  port?: number;
  theme?: string;
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
