import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { BlockType } from '@/types';
import type { Block } from '@/types';

const mockUpdateBlock = vi.fn();
const mockDeleteBlock = vi.fn();
const mockAppendBlocks = vi.fn();
const mockSetDirty = vi.fn();

vi.mock('@/store/noteStore', () => ({
  useNoteStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      updateBlock: mockUpdateBlock,
      deleteBlock: mockDeleteBlock,
      appendBlocks: mockAppendBlocks,
      setDirty: mockSetDirty,
    }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const makeBlock = (overrides: Partial<Block> = {}): Block => ({
  id: 'block-1',
  noteId: 'note-1',
  type: BlockType.Paragraph,
  content: 'Hello world',
  meta: {},
  position: 0,
  parentId: null,
  ...overrides,
});

describe('BlockEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no blocks', () => {
    render(<BlockEditor blocks={[]} noteId="note-1" />);
    expect(screen.getByText("Type '/' for commands")).toBeInTheDocument();
    expect(screen.getByText('Add a block')).toBeInTheDocument();
  });

  it('renders blocks from the blocks array', () => {
    const blocks = [
      makeBlock({ id: 'b1', content: 'First paragraph', position: 0 }),
      makeBlock({ id: 'b2', content: 'Second paragraph', position: 1 }),
    ];
    render(<BlockEditor blocks={blocks} noteId="note-1" />);
    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph')).toBeInTheDocument();
  });

  it('renders blocks sorted by position', () => {
    const blocks = [
      makeBlock({ id: 'b2', content: 'Second', position: 1 }),
      makeBlock({ id: 'b1', content: 'First', position: 0 }),
    ];
    render(<BlockEditor blocks={blocks} noteId="note-1" />);
    const items = screen.getAllByText(/First|Second/);
    expect(items[0].textContent).toBe('First');
    expect(items[1].textContent).toBe('Second');
  });

  it('creates a new block when "Add a block" is clicked', () => {
    render(<BlockEditor blocks={[]} noteId="note-1" />);
    fireEvent.click(screen.getByText('Add a block'));
    expect(mockAppendBlocks).toHaveBeenCalledWith('note-1', [
      expect.objectContaining({ type: BlockType.Paragraph, content: '' }),
    ]);
    expect(mockSetDirty).toHaveBeenCalledWith(true);
  });
});
