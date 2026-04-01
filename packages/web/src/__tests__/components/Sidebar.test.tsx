import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import type { Note } from '@/types';

const mockNotes: Note[] = [
  {
    id: 'note-1',
    title: 'My First Note',
    folderId: null,
    storageFmt: 'json',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    blocks: [],
    tags: [{ id: 'tag-1', name: 'important' }],
  },
  {
    id: 'note-2',
    title: 'Second Note',
    folderId: null,
    storageFmt: 'json',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    blocks: [],
    tags: [],
  },
];

const mockFetchNotes = vi.fn();
const mockCreateNote = vi.fn();
const mockSearch = vi.fn();

vi.mock('@/store/noteStore', () => ({
  useNoteStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      notes: mockNotes,
      fetchNotes: mockFetchNotes,
      createNote: mockCreateNote,
    }),
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      searchResults: [],
      search: mockSearch,
    }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Notes, Search, and Tags tabs', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders the note list', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('My First Note')).toBeInTheDocument();
    expect(screen.getByText('Second Note')).toBeInTheDocument();
  });

  it('renders the New Note button', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('New Note')).toBeInTheDocument();
  });

  it('renders Graph and Daily navigation buttons', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Graph')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  it('calls fetchNotes on mount', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(mockFetchNotes).toHaveBeenCalled();
  });
});
