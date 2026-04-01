import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '@/pages/Home';
import type { Note } from '@/types';

const mockNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Project Plan',
    folderId: null,
    storageFmt: 'json',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    blocks: [{ id: 'b1', noteId: 'note-1', type: 'paragraph' as never, content: 'This is the plan content', meta: {}, position: 0, parentId: null }],
    tags: [{ id: 'tag-1', name: 'project' }],
  },
  {
    id: 'note-2',
    title: 'Meeting Notes',
    folderId: null,
    storageFmt: 'json',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
    blocks: [],
    tags: [],
  },
];

const mockFetchNotes = vi.fn();
const mockCreateNote = vi.fn();

vi.mock('@/store/noteStore', () => ({
  useNoteStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      notes: mockNotes,
      loading: false,
      fetchNotes: mockFetchNotes,
      createNote: mockCreateNote,
    }),
}));

vi.mock('@/api/client', () => ({
  api: {
    folders: { list: vi.fn().mockResolvedValue([]) },
  },
}));

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Notes heading', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('renders note cards', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText('Project Plan')).toBeInTheDocument();
    expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
  });

  it('renders the New Note button', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText('New Note')).toBeInTheDocument();
  });

  it('shows snippet from first block content', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText('This is the plan content')).toBeInTheDocument();
  });

  it('renders tag badges on note cards', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('calls fetchNotes on mount', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(mockFetchNotes).toHaveBeenCalled();
  });
});
