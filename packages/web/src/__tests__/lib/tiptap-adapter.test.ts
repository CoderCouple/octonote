import { describe, it, expect } from 'vitest';
import { blocksToMarkdown, markdownToBlocks } from '@/lib/tiptap-adapter';
import { BlockType } from '@/types';
import type { Block } from '@/types';

function octo(
  partial: Partial<Block> & { type: BlockType; position: number },
): Block {
  return {
    id: `b${partial.position}`,
    noteId: 'note-1',
    content: '',
    meta: {},
    parentId: null,
    ...partial,
  };
}

describe('tiptap-adapter', () => {
  it('round-trips the directly-mappable block types', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Heading, content: 'A heading', meta: { level: 2 }, position: 0 }),
      octo({ type: BlockType.Paragraph, content: 'hello world', position: 1 }),
      octo({ type: BlockType.Bullet, content: 'bullet a', position: 2 }),
      octo({ type: BlockType.Bullet, content: 'bullet b', position: 3 }),
      octo({ type: BlockType.Code, content: 'const x = 1;', meta: { language: 'typescript' }, position: 4 }),
      octo({ type: BlockType.Quote, content: 'a wise quote', position: 5 }),
      octo({ type: BlockType.Divider, content: '', position: 6 }),
    ];

    const md = blocksToMarkdown(blocks);
    const back = markdownToBlocks(md);

    expect(back).toHaveLength(blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      expect(back[i].type).toBe(blocks[i].type);
      expect(back[i].content).toBe(blocks[i].content);
      expect(back[i].position).toBe(i);
    }
  });

  it('preserves heading level + code language in meta', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Heading, content: 'Title', meta: { level: 1 }, position: 0 }),
      octo({ type: BlockType.Code, content: 'print(1)', meta: { language: 'python' }, position: 1 }),
    ];
    const back = markdownToBlocks(blocksToMarkdown(blocks));
    expect(back[0].meta).toEqual({ level: 1 });
    expect(back[1].meta).toEqual({ language: 'python' });
  });

  it('round-trips task items with checked state', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Todo, content: 'do this', meta: { checked: true }, position: 0 }),
      octo({ type: BlockType.Todo, content: 'not yet', meta: { checked: false }, position: 1 }),
    ];
    const md = blocksToMarkdown(blocks);
    const back = markdownToBlocks(md);
    expect(back[0]).toMatchObject({ type: BlockType.Todo, content: 'do this', meta: { checked: true } });
    expect(back[1]).toMatchObject({ type: BlockType.Todo, content: 'not yet', meta: { checked: false } });
  });

  it('keeps inline markdown intact in content strings (storage stays markdown)', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Paragraph, content: 'a **bold** and `code` word', position: 0 }),
    ];
    const md = blocksToMarkdown(blocks);
    const back = markdownToBlocks(md);
    expect(back[0].content).toBe('a **bold** and `code` word');
  });

  it('round-trips a callout (with icon) instead of degrading to a quote', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Callout, content: 'heads up', meta: { icon: '💡' }, position: 0 }),
    ];
    const back = markdownToBlocks(blocksToMarkdown(blocks));
    expect(back[0]).toMatchObject({
      type: BlockType.Callout,
      content: 'heads up',
      meta: { icon: '💡' },
    });
  });

  it('round-trips a block-level wikilink embed', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Embed, content: 'Project Plan', position: 0 }),
    ];
    const back = markdownToBlocks(blocksToMarkdown(blocks));
    expect(back[0]).toMatchObject({ type: BlockType.Embed, content: 'Project Plan' });
  });

  it('round-trips a mermaid diagram (not as a generic code block)', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Diagram, content: 'graph TD;\n  A-->B;', meta: { diagramType: 'mermaid' }, position: 0 }),
    ];
    const back = markdownToBlocks(blocksToMarkdown(blocks));
    expect(back[0]).toMatchObject({
      type: BlockType.Diagram,
      content: 'graph TD;\n  A-->B;',
      meta: { diagramType: 'mermaid' },
    });
  });
});
