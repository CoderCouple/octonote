import { create } from 'zustand';
import { api } from '@/api/client';
import { wsClient } from '@/api/ws';
import type { Note, NoteType, Block } from '@/types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface NoteState {
  notes: Note[];
  currentNote: Note | null;
  dirty: boolean;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface NoteActions {
  /** Fetch the note list, optionally filtered by folder / project / type / tag. */
  fetchNotes(params?: { folder?: string; project?: string; type?: NoteType; tag?: string }): Promise<void>;

  /** Fetch a single note (with blocks + tags) and set it as current. */
  fetchNote(id: string): Promise<void>;

  /** Create a new note and prepend it to the list. */
  createNote(data: {
    title: string;
    folderId?: string;
    projectId?: string;
    type?: NoteType;
    storageFmt?: 'json' | 'markdown';
  }): Promise<Note>;

  /** Update an existing note's metadata. */
  updateNote(
    id: string,
    data: { title?: string; folderId?: string | null; projectId?: string | null; type?: NoteType },
  ): Promise<void>;

  /** Delete a note and remove it from the list. */
  deleteNote(id: string): Promise<void>;

  /** Set the dirty flag (unsaved changes). */
  setDirty(dirty: boolean): void;

  /** Append blocks to a note and refresh currentNote. */
  appendBlocks(noteId: string, blocks: Block[]): Promise<void>;

  /** Replace all blocks on a note and refresh currentNote. */
  replaceBlocks(noteId: string, blocks: Block[]): Promise<void>;

  /** Update a single block and refresh currentNote. */
  updateBlock(
    noteId: string,
    blockId: string,
    data: { content?: string; type?: string; meta?: Record<string, unknown> },
  ): Promise<void>;

  /** Delete a single block and refresh currentNote. */
  deleteBlock(noteId: string, blockId: string): Promise<void>;

  /** Add a tag to a note and refresh currentNote. */
  addTag(noteId: string, name: string): Promise<void>;

  /** Remove a tag from a note and refresh currentNote. */
  removeTag(noteId: string, tagName: string): Promise<void>;

  /** Connect to WebSocket and auto-refresh on server events. */
  initWebSocket(): void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNoteStore = create<NoteState & NoteActions>()((set, get) => ({
  // -- State ----------------------------------------------------------------
  notes: [],
  currentNote: null,
  dirty: false,
  loading: false,

  // -- Actions --------------------------------------------------------------

  async fetchNotes(params) {
    set({ loading: true });
    try {
      const notes = await api.notes.list(params);
      set({ notes });
    } finally {
      set({ loading: false });
    }
  },

  async fetchNote(id) {
    set({ loading: true });
    try {
      const note = await api.notes.get(id);
      set({ currentNote: note });
    } finally {
      set({ loading: false });
    }
  },

  async createNote(data) {
    const note = await api.notes.create(data);
    set((s) => ({ notes: [note, ...s.notes] }));
    return note;
  },

  async updateNote(id, data) {
    const updated = await api.notes.update(id, data);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? updated : n)),
      currentNote: s.currentNote?.id === id ? updated : s.currentNote,
    }));
  },

  async deleteNote(id) {
    await api.notes.delete(id);
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      currentNote: s.currentNote?.id === id ? null : s.currentNote,
    }));
  },

  setDirty(dirty) {
    set({ dirty });
  },

  async appendBlocks(noteId, blocks) {
    await api.blocks.append(noteId, blocks);
    // Refresh currentNote to get the updated block list
    const { currentNote } = get();
    if (currentNote?.id === noteId) {
      const refreshed = await api.notes.get(noteId);
      set({ currentNote: refreshed });
    }
  },

  async replaceBlocks(noteId, blocks) {
    await api.blocks.replace(noteId, blocks);
    const { currentNote } = get();
    if (currentNote?.id === noteId) {
      const refreshed = await api.notes.get(noteId);
      set({ currentNote: refreshed });
    }
  },

  async updateBlock(noteId, blockId, data) {
    await api.blocks.update(noteId, blockId, data);
    const { currentNote } = get();
    if (currentNote?.id === noteId) {
      const refreshed = await api.notes.get(noteId);
      set({ currentNote: refreshed });
    }
  },

  async deleteBlock(noteId, blockId) {
    await api.blocks.delete(noteId, blockId);
    const { currentNote } = get();
    if (currentNote?.id === noteId) {
      const refreshed = await api.notes.get(noteId);
      set({ currentNote: refreshed });
    }
  },

  async addTag(noteId, name) {
    await api.tags.add(noteId, name);
    const { currentNote } = get();
    if (currentNote?.id === noteId) {
      const refreshed = await api.notes.get(noteId);
      set({ currentNote: refreshed });
    }
  },

  async removeTag(noteId, tagName) {
    await api.tags.remove(noteId, tagName);
    const { currentNote } = get();
    if (currentNote?.id === noteId) {
      const refreshed = await api.notes.get(noteId);
      set({ currentNote: refreshed });
    }
  },

  initWebSocket() {
    wsClient.connect();

    const refreshList = () => {
      get().fetchNotes();
    };

    const refreshCurrent = (data: unknown) => {
      const { currentNote } = get();
      if (!currentNote) return;

      // If the event payload includes a noteId, only refresh if it matches
      const payload = data as Record<string, unknown> | null;
      const noteId = payload?.noteId ?? payload?.id;
      if (noteId && noteId !== currentNote.id) return;

      get().fetchNote(currentNote.id);
    };

    wsClient.on('note:created', refreshList);
    wsClient.on('note:updated', (data) => {
      refreshList();
      refreshCurrent(data);
    });
    wsClient.on('note:deleted', (data) => {
      const payload = data as Record<string, unknown> | null;
      const noteId = payload?.noteId ?? payload?.id;
      if (noteId) {
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== noteId),
          currentNote:
            s.currentNote?.id === noteId ? null : s.currentNote,
        }));
      } else {
        refreshList();
      }
    });
    wsClient.on('blocks:updated', refreshCurrent);
    wsClient.on('tags:updated', refreshCurrent);
    wsClient.on('search:reindexed', () => {
      // Search index rebuilt; no direct state impact but callers may
      // want to re-run searches. This is a no-op here.
    });
  },
}));
