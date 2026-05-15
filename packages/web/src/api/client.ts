import type {
  Note,
  NoteType,
  Block,
  Tag,
  Folder,
  Project,
  SearchResult,
  Link,
  GraphData,
  AiResult,
} from '@/types';

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  // 204 No Content or empty body
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// ---------------------------------------------------------------------------
// Query-string helper
// ---------------------------------------------------------------------------

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string | number] => e[1] !== undefined,
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
}

// ---------------------------------------------------------------------------
// API namespaces
// ---------------------------------------------------------------------------

const notes = {
  /** List notes, optionally filtered by folder, project, type, or tag. */
  list(params?: { folder?: string; project?: string; type?: NoteType; tag?: string }): Promise<Note[]> {
    return fetchJson<Note[]>(`/api/notes${qs(params ?? {})}`);
  },

  /** Get a single note (with blocks + tags). */
  get(id: string): Promise<Note> {
    return fetchJson<Note>(`/api/notes/${id}`);
  },

  /** Create a new note. */
  create(data: {
    title: string;
    folderId?: string;
    projectId?: string;
    type?: NoteType;
    storageFmt?: 'json' | 'markdown';
  }): Promise<Note> {
    return fetchJson<Note>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Update an existing note. */
  update(
    id: string,
    data: { title?: string; folderId?: string | null; projectId?: string | null; type?: NoteType },
  ): Promise<Note> {
    return fetchJson<Note>(`/api/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Delete a note. */
  delete(id: string): Promise<{ deleted: true; noteId: string }> {
    return fetchJson<{ deleted: true; noteId: string }>(`/api/notes/${id}`, {
      method: 'DELETE',
    });
  },
};

/** The server only reads type/content/meta when (re)creating blocks. */
type BlockInput = Pick<Block, 'type' | 'content' | 'meta'>;

const blocks = {
  /** Append blocks to a note. */
  append(noteId: string, blockList: BlockInput[]): Promise<Block[]> {
    return fetchJson<Block[]>(`/api/notes/${noteId}/blocks`, {
      method: 'POST',
      body: JSON.stringify({ blocks: blockList }),
    });
  },

  /** Replace all blocks on a note. */
  replace(noteId: string, blockList: BlockInput[]): Promise<Block[]> {
    return fetchJson<Block[]>(`/api/notes/${noteId}/blocks`, {
      method: 'PUT',
      body: JSON.stringify({ blocks: blockList }),
    });
  },

  /** Update a single block. */
  update(
    noteId: string,
    blockId: string,
    data: { content?: string; type?: string; meta?: Record<string, unknown> },
  ): Promise<Block> {
    return fetchJson<Block>(`/api/notes/${noteId}/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Delete a single block. */
  delete(
    noteId: string,
    blockId: string,
  ): Promise<{ deleted: true; blockId: string }> {
    return fetchJson<{ deleted: true; blockId: string }>(
      `/api/notes/${noteId}/blocks/${blockId}`,
      { method: 'DELETE' },
    );
  },
};

const search = {
  /** Full-text search across notes. */
  query(q: string, limit = 10): Promise<SearchResult[]> {
    return fetchJson<SearchResult[]>(`/api/search${qs({ q, limit })}`);
  },
};

const tags = {
  /** List all tags. */
  list(): Promise<Tag[]> {
    return fetchJson<Tag[]>('/api/tags');
  },

  /** Add a tag to a note. */
  add(noteId: string, name: string): Promise<Tag> {
    return fetchJson<Tag>(`/api/notes/${noteId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  /** Remove a tag from a note. */
  remove(noteId: string, tagName: string): Promise<{ deleted: true }> {
    return fetchJson<{ deleted: true }>(
      `/api/notes/${noteId}/tags/${encodeURIComponent(tagName)}`,
      { method: 'DELETE' },
    );
  },
};

const folders = {
  /** List all folders. */
  list(): Promise<Folder[]> {
    return fetchJson<Folder[]>('/api/folders');
  },

  /** Create a folder. */
  create(data: { name: string; parentId?: string }): Promise<Folder> {
    return fetchJson<Folder>('/api/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Rename a folder. */
  update(id: string, data: { name: string }): Promise<Folder> {
    return fetchJson<Folder>(`/api/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Delete a folder. */
  delete(id: string): Promise<{ deleted: true }> {
    return fetchJson<{ deleted: true }>(`/api/folders/${id}`, {
      method: 'DELETE',
    });
  },
};

export type GithubRepoCard = {
  kind: 'repo';
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  forks: number;
  homepage: string | null;
  ownerAvatar: string | null;
};

export type GithubUserCard = {
  kind: 'user';
  login: string;
  name: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  company: string | null;
  blog: string | null;
  avatar: string | null;
};

export interface EmbedResult {
  url: string;
  type: 'github' | 'link';
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  github?: GithubRepoCard | GithubUserCard;
}

const embed = {
  /** Fetch Open Graph metadata (or GitHub repo data) for a URL. */
  fetch(url: string): Promise<EmbedResult> {
    return fetchJson<EmbedResult>(`/api/embed?url=${encodeURIComponent(url)}`);
  },
};

const projects = {
  /** List all projects. */
  list(): Promise<Project[]> {
    return fetchJson<Project[]>('/api/projects');
  },

  /** Get a project (by id or slug) with its notes. */
  get(idOrSlug: string): Promise<Project & { notes: Note[] }> {
    return fetchJson<Project & { notes: Note[] }>(`/api/projects/${idOrSlug}`);
  },

  /** Create a project. */
  create(data: { name: string; slug?: string; description?: string; repo?: string }): Promise<Project> {
    return fetchJson<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Update a project. */
  update(
    id: string,
    data: { name?: string; slug?: string; description?: string | null; repo?: string | null; status?: string },
  ): Promise<Project> {
    return fetchJson<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Delete a project (its notes are kept, just unlinked). */
  delete(id: string): Promise<{ deleted: true; projectId: string }> {
    return fetchJson<{ deleted: true; projectId: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

const links = {
  /** Get forward links and backlinks for a note. */
  get(noteId: string): Promise<{ forward: Link[]; backlinks: Link[] }> {
    return fetchJson<{ forward: Link[]; backlinks: Link[] }>(
      `/api/notes/${noteId}/links`,
    );
  },
};

const graph = {
  /** Get the full link graph for visualization. */
  get(): Promise<GraphData> {
    return fetchJson<GraphData>('/api/graph');
  },
};

const ai = {
  /** Send a one-shot AI prompt and get a complete result. */
  run(prompt: string, model?: string): Promise<AiResult> {
    return fetchJson<AiResult>('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ prompt, model }),
    });
  },

  /**
   * Stream an AI response via SSE.
   *
   * The server endpoint POST /api/ai/stream returns an SSE stream.
   * Each SSE event has `data: <json>` lines. The callback receives each
   * parsed chunk as it arrives. Returns a promise that resolves when the
   * stream is finished.
   */
  async stream(
    prompt: string,
    onChunk: (chunk: unknown) => void,
    options?: { model?: string; signal?: AbortSignal },
  ): Promise<void> {
    const res = await fetch('/api/ai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: options?.model }),
      signal: options?.signal,
    });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      throw new ApiError(res.status, res.statusText, body);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const parts = buffer.split('\n\n');
        // The last element may be an incomplete event; keep it in the buffer
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') return;
              try {
                onChunk(JSON.parse(jsonStr));
              } catch {
                // non-JSON data line, pass raw string
                onChunk(jsonStr);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};

// ---------------------------------------------------------------------------
// Public API object
// ---------------------------------------------------------------------------

export const api = {
  notes,
  blocks,
  search,
  tags,
  folders,
  projects,
  embed,
  links,
  graph,
  ai,
} as const;

export { ApiError, fetchJson };
