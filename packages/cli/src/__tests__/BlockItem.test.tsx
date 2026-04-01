import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { BlockItem } from '../tui/BlockItem.js';
import type { Block, BlockType } from '@octonote/core';

function makeBlock(type: BlockType, content: string, meta: Record<string, unknown> = {}): Block {
  return {
    id: 'test-block',
    noteId: 'test-note',
    type,
    content,
    meta,
    position: 0,
    parentId: null,
  };
}

describe('BlockItem', () => {
  it('renders paragraph block', () => {
    const block = makeBlock('paragraph' as BlockType, 'Hello world');
    const { lastFrame } = render(
      <BlockItem block={block} active={false} editing={false} onChange={() => {}} />
    );
    expect(lastFrame()!).toContain('Hello world');
  });

  it('renders heading with prefix', () => {
    const block = makeBlock('heading' as BlockType, 'Title', { level: 2 });
    const { lastFrame } = render(
      <BlockItem block={block} active={false} editing={false} onChange={() => {}} />
    );
    expect(lastFrame()!).toContain('##');
    expect(lastFrame()!).toContain('Title');
  });

  it('shows cursor indicator when active', () => {
    const block = makeBlock('paragraph' as BlockType, 'Active block');
    const { lastFrame } = render(
      <BlockItem block={block} active={true} editing={false} onChange={() => {}} />
    );
    expect(lastFrame()!).toContain('▸');
  });

  it('renders todo with check state', () => {
    const block = makeBlock('todo' as BlockType, 'Buy milk', { checked: true });
    const { lastFrame } = render(
      <BlockItem block={block} active={false} editing={false} onChange={() => {}} />
    );
    const output = lastFrame()!;
    expect(output).toContain('✓');
  });

  it('renders bullet with prefix', () => {
    const block = makeBlock('bullet' as BlockType, 'List item');
    const { lastFrame } = render(
      <BlockItem block={block} active={false} editing={false} onChange={() => {}} />
    );
    const output = lastFrame()!;
    expect(output).toContain('•');
    expect(output).toContain('List item');
  });
});
