import { describe, it, expect } from 'vitest';
import { toTiptap, fromTiptap } from '@/lib/tiptap-adapter';
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
      octo({ type: BlockType.Paragraph, content: 'hello world', position: 0 }),
      octo({ type: BlockType.Heading, content: 'A heading', meta: { level: 2 }, position: 1 }),
      octo({ type: BlockType.Bullet, content: 'bullet a', position: 2 }),
      octo({ type: BlockType.Bullet, content: 'bullet b', position: 3 }),
      octo({ type: BlockType.Numbered, content: 'first item', position: 4 }),
      octo({ type: BlockType.Todo, content: 'do this', meta: { checked: true }, position: 5 }),
      octo({ type: BlockType.Code, content: 'const x = 1;', meta: { language: 'typescript' }, position: 6 }),
      octo({ type: BlockType.Quote, content: 'a wise quote', position: 7 }),
      octo({ type: BlockType.Divider, content: '', position: 8 }),
    ];

    const doc = toTiptap(blocks);
    const back = fromTiptap(doc);

    expect(back).toHaveLength(blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      expect(back[i].type).toBe(blocks[i].type);
      expect(back[i].content).toBe(blocks[i].content);
      expect(back[i].meta).toEqual(blocks[i].meta);
      expect(back[i].position).toBe(i);
    }
  });

  it('groups consecutive list items into a single Tiptap list wrapper', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Bullet, content: 'a', position: 0 }),
      octo({ type: BlockType.Bullet, content: 'b', position: 1 }),
      octo({ type: BlockType.Paragraph, content: 'gap', position: 2 }),
      octo({ type: BlockType.Bullet, content: 'c', position: 3 }),
    ];
    const doc = toTiptap(blocks);
    const topTypes = (doc.content ?? []).map((n) => n.type);
    expect(topTypes).toEqual(['bulletList', 'paragraph', 'bulletList']);
  });

  it('round-trips an image via src + alt', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Image, content: 'https://example.com/x.png', meta: { alt: 'a picture' }, position: 0 }),
    ];
    const doc = toTiptap(blocks);
    const back = fromTiptap(doc);
    expect(back[0].type).toBe(BlockType.Image);
    expect(back[0].content).toBe('https://example.com/x.png');
    expect(back[0].meta).toEqual({ alt: 'a picture' });
  });
});
