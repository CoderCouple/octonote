import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoBlock } from '@/components/blocks/TodoBlock';
import { BlockType } from '@/types';
import type { Block } from '@/types';

const makeBlock = (overrides: Partial<Block> = {}): Block => ({
  id: 'block-1',
  noteId: 'note-1',
  type: BlockType.Todo,
  content: 'Buy groceries',
  meta: { checked: false },
  position: 0,
  parentId: null,
  ...overrides,
});

describe('TodoBlock', () => {
  const onUpdate = vi.fn();
  const onKeyDown = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the todo text', () => {
    render(
      <TodoBlock
        block={makeBlock()}
        isEditing={false}
        onUpdate={onUpdate}
        onKeyDown={onKeyDown}
      />,
    );
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders unchecked checkbox when not checked', () => {
    render(
      <TodoBlock
        block={makeBlock({ meta: { checked: false } })}
        isEditing={false}
        onUpdate={onUpdate}
        onKeyDown={onKeyDown}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders checked checkbox when checked', () => {
    render(
      <TodoBlock
        block={makeBlock({ meta: { checked: true } })}
        isEditing={false}
        onUpdate={onUpdate}
        onKeyDown={onKeyDown}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onUpdate with toggled checked state when checkbox is clicked', () => {
    render(
      <TodoBlock
        block={makeBlock({ meta: { checked: false } })}
        isEditing={false}
        onUpdate={onUpdate}
        onKeyDown={onKeyDown}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onUpdate).toHaveBeenCalledWith('Buy groceries', { checked: true });
  });
});
