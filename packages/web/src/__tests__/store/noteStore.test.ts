import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note } from '@/types';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('@/api/client', () => ({
  api: {
    notes: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    blocks: {
      append: vi.fn(),
      replace: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tags: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    search: {
      query: vi.fn(),
    },
  },
}));

vi.mock('@/api/ws', () => ({
  wsClient: {
    connect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  },
}));

import { useNoteStore } from '@/store/noteStore';
import { api } from '@/api/client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeNote1: Note = {
  id: 'note-1',
  title: 'First Note',
  folderId: null,
  projectId: null,
  type: 'note',
  storageFmt: 'json',
  createdAt: '2026-03-30T00:00:00.000Z',
  updatedAt: '2026-03-30T00:00:00.000Z',
  blocks: [],
  tags: [],
};

const fakeNote2: Note = {
  id: 'note-2',
  title: 'Second Note',
  folderId: 'folder-1',
  projectId: null,
  type: 'note',
  storageFmt: 'markdown',
  createdAt: '2026-03-30T01:00:00.000Z',
  updatedAt: '2026-03-30T01:00:00.000Z',
  blocks: [],
  tags: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('noteStore', () => {
  beforeEach(() => {
    // Reset only data fields, keep action functions
    useNoteStore.setState({
      notes: [],
      currentNote: null,
      dirty: false,
      loading: false,
    });
    vi.clearAllMocks();
  });

  it('has correct initial state', () => {
    const state = useNoteStore.getState();

    expect(state.notes).toEqual([]);
    expect(state.currentNote).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.dirty).toBe(false);
  });

  it('fetchNotes() populates notes array', async () => {
    const notesList = [fakeNote1, fakeNote2];
    vi.mocked(api.notes.list).mockResolvedValueOnce(notesList);

    await useNoteStore.getState().fetchNotes();

    const state = useNoteStore.getState();
    expect(state.notes).toEqual(notesList);
    expect(state.loading).toBe(false);
    expect(api.notes.list).toHaveBeenCalledOnce();
  });

  it('fetchNote(id) sets currentNote', async () => {
    vi.mocked(api.notes.get).mockResolvedValueOnce(fakeNote1);

    await useNoteStore.getState().fetchNote('note-1');

    const state = useNoteStore.getState();
    expect(state.currentNote).toEqual(fakeNote1);
    expect(state.loading).toBe(false);
    expect(api.notes.get).toHaveBeenCalledWith('note-1');
  });

  it('createNote() adds to notes array', async () => {
    // Pre-populate with one note
    useNoteStore.setState({ notes: [fakeNote2] });

    vi.mocked(api.notes.create).mockResolvedValueOnce(fakeNote1);

    const result = await useNoteStore.getState().createNote({
      title: 'First Note',
    });

    const state = useNoteStore.getState();
    // New note should be prepended
    expect(state.notes).toHaveLength(2);
    expect(state.notes[0]).toEqual(fakeNote1);
    expect(state.notes[1]).toEqual(fakeNote2);
    expect(result).toEqual(fakeNote1);
    expect(api.notes.create).toHaveBeenCalledWith({ title: 'First Note' });
  });

  it('deleteNote() removes from notes array', async () => {
    // Pre-populate with two notes
    useNoteStore.setState({ notes: [fakeNote1, fakeNote2] });

    vi.mocked(api.notes.delete).mockResolvedValueOnce({
      deleted: true,
      noteId: 'note-1',
    });

    await useNoteStore.getState().deleteNote('note-1');

    const state = useNoteStore.getState();
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].id).toBe('note-2');
    expect(api.notes.delete).toHaveBeenCalledWith('note-1');
  });

  it('setDirty() updates dirty flag', () => {
    expect(useNoteStore.getState().dirty).toBe(false);

    useNoteStore.getState().setDirty(true);
    expect(useNoteStore.getState().dirty).toBe(true);

    useNoteStore.getState().setDirty(false);
    expect(useNoteStore.getState().dirty).toBe(false);
  });
});
