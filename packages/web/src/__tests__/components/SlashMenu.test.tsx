import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashMenu } from '@/components/editor/SlashMenu';
import { BlockType } from '@/types';

describe('SlashMenu', () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all block type options', () => {
    render(<SlashMenu onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.getByText('Heading 3')).toBeInTheDocument();
    expect(screen.getByText('Bullet List')).toBeInTheDocument();
    expect(screen.getByText('Numbered List')).toBeInTheDocument();
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Quote')).toBeInTheDocument();
    expect(screen.getByText('Callout')).toBeInTheDocument();
    expect(screen.getByText('Divider')).toBeInTheDocument();
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
  });

  it('calls onSelect when an item is clicked', () => {
    render(<SlashMenu onSelect={onSelect} onClose={onClose} />);
    fireEvent.click(screen.getByText('Todo'));
    expect(onSelect).toHaveBeenCalledWith(BlockType.Todo);
  });

  it('calls onClose when Escape is pressed', () => {
    render(<SlashMenu onSelect={onSelect} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the filter input', () => {
    render(<SlashMenu onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByPlaceholderText('Filter block type...')).toBeInTheDocument();
  });
});
