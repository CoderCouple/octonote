import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NotePage } from '@/pages/NotePage';
import type { Note } from '@/types';
import { BlockType } from '@/types';

const mockNote: Note = {
  id: 'note-1',
  title: 'Test Note',
  folderId: null,
  projectId: null,
  type: 'note',
  storageFmt: 'json',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  blocks: [
    {
      id: 'b1',
      noteId: 'note-1',
      type: BlockType.Paragraph,
      content: 'Hello from note',
      meta: {},
      position: 0,
      parentId: null,
    },
  ],
  tags: [{ id: 'tag-1', name: 'test-tag' }],
};

const mockFetchNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockSetDirty = vi.fn();
const mockInitWebSocket = vi.fn();

let currentNote: Note | null = mockNote;

vi.mock('@/store/noteStore', () => ({
  useNoteStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      currentNote,
      loading: false,
      dirty: false,
      fetchNote: mockFetchNote,
      updateNote: mockUpdateNote,
      setDirty: mockSetDirty,
      initWebSocket: mockInitWebSocket,
      updateBlock: vi.fn(),
      deleteBlock: vi.fn(),
      appendBlocks: vi.fn(),
    }),
}));

vi.mock('@/api/client', () => ({
  api: {
    links: { get: vi.fn().mockResolvedValue({ forward: [], backlinks: [] }) },
    notes: { get: vi.fn() },
  },
}));

vi.mock('@/api/ws', () => ({
  wsClient: { connect: vi.fn(), on: vi.fn(), off: vi.fn(), disconnect: vi.fn() },
}));

// BlockNote can't render in jsdom — stub the editor with a plain block list.
vi.mock('@/components/editor/BlockEditor', () => ({
  BlockEditor: ({ blocks }: { blocks: Array<{ id: string; content: string }> }) => (
    <div data-testid="block-editor">
      {blocks.map((b) => (
        <div key={b.id}>{b.content}</div>
      ))}
    </div>
  ),
}));

function renderNotePage() {
  return render(
    <MemoryRouter initialEntries={['/notes/note-1']}>
      <Routes>
        <Route path="/notes/:id" element={<NotePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentNote = mockNote;
  });

  it('renders the note title', () => {
    renderNotePage();
    const input = screen.getByDisplayValue('Test Note');
    expect(input).toBeInTheDocument();
  });

  it('renders tag badges', () => {
    renderNotePage();
    expect(screen.getByText('test-tag')).toBeInTheDocument();
  });

  it('renders the block editor with blocks', () => {
    renderNotePage();
    expect(screen.getByText('Hello from note')).toBeInTheDocument();
  });

  it('renders the backlinks toggle', () => {
    renderNotePage();
    expect(screen.getByText(/Backlinks/)).toBeInTheDocument();
  });

  it('renders note not found when currentNote is null', () => {
    currentNote = null;
    renderNotePage();
    expect(screen.getByText('Note not found')).toBeInTheDocument();
  });

  it('calls fetchNote on mount', () => {
    renderNotePage();
    expect(mockFetchNote).toHaveBeenCalledWith('note-1');
  });

  it('initializes WebSocket on mount', () => {
    renderNotePage();
    expect(mockInitWebSocket).toHaveBeenCalled();
  });
});
