import { describe, it, expect } from 'vitest';
import { BlockNoteEditor } from '@blocknote/core';
import { toBlockNote, fromBlockNote } from '@/lib/blocknote-adapter';
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

describe('blocknote-adapter', () => {
  it('round-trips the directly-mappable block types', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Paragraph, content: 'hello world', position: 0 }),
      octo({ type: BlockType.Heading, content: 'A heading', meta: { level: 2 }, position: 1 }),
      octo({ type: BlockType.Bullet, content: 'a bullet', position: 2 }),
      octo({ type: BlockType.Numbered, content: 'first item', position: 3 }),
      octo({ type: BlockType.Todo, content: 'do this', meta: { checked: true }, position: 4 }),
      octo({ type: BlockType.Code, content: 'const x = 1;', meta: { language: 'typescript' }, position: 5 }),
      octo({ type: BlockType.Quote, content: 'a wise quote', position: 6 }),
      octo({ type: BlockType.Divider, content: '', position: 7 }),
    ];

    const editor = BlockNoteEditor.create({ initialContent: toBlockNote(blocks) });
    const back = fromBlockNote(editor.document);

    expect(back).toHaveLength(blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      expect(back[i].type).toBe(blocks[i].type);
      expect(back[i].content).toBe(blocks[i].content);
      expect(back[i].meta).toEqual(blocks[i].meta);
      expect(back[i].position).toBe(i);
    }
  });

  it('maps an image block via url + caption', () => {
    const blocks: Block[] = [
      octo({ type: BlockType.Image, content: 'https://example.com/x.png', meta: { alt: 'a picture' }, position: 0 }),
    ];
    const editor = BlockNoteEditor.create({ initialContent: toBlockNote(blocks) });
    const back = fromBlockNote(editor.document);
    expect(back[0].type).toBe(BlockType.Image);
    expect(back[0].content).toBe('https://example.com/x.png');
    expect(back[0].meta).toEqual({ alt: 'a picture' });
  });
});
