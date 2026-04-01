import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import type { Note } from '@/types';

const mockNote: Note = {
  id: 'note-1',
  title: 'Test Note Title',
  folderId: null,
  storageFmt: 'json',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  blocks: [],
  tags: [
    { id: 'tag-1', name: 'work' },
    { id: 'tag-2', name: 'ideas' },
  ],
};

const mockDeleteNote = vi.fn();
const mockToggleSidebar = vi.fn();

let currentNote: Note | null = mockNote;

vi.mock('@/store/noteStore', () => ({
  useNoteStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        currentNote,
        deleteNote: mockDeleteNote,
      }),
    {
      getState: () => ({
        fetchNote: vi.fn(),
      }),
    },
  ),
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      toggleSidebar: mockToggleSidebar,
    }),
}));

vi.mock('@/api/client', () => ({
  api: {
    notes: { update: vi.fn() },
  },
}));

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentNote = mockNote;
  });

  it('renders the note title when currentNote exists', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Test Note Title')).toBeInTheDocument();
  });

  it('renders tag badges', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('ideas')).toBeInTheDocument();
  });

  it('renders OctoNote when no currentNote', () => {
    currentNote = null;
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );
    expect(screen.getByText('OctoNote')).toBeInTheDocument();
  });
});
