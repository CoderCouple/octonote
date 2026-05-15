import type { JSONContent } from '@tiptap/core';
import { BlockType } from '@/types';
import type { Block } from '@/types';

/**
 * Bidirectional adapter between OctoNote's flat block model and Tiptap's
 * ProseMirror JSON document model.
 *
 * OctoNote blocks are flat (ordered by `position`); Tiptap's doc is a tree
 * with grouped lists (bulletList → listItem → paragraph). Consecutive
 * OctoNote bullet/numbered/todo blocks get grouped into one list wrapper
 * on the way in; lists get ungrouped (one block per item) on the way back.
 *
 * `content` is plain text in OctoNote — inline marks (bold/italic/links)
 * added in Tiptap are flattened on save.
 *
 * callout / embed / mermaid / table fall back to paragraphs for now.
 */

/** Block shape produced for persistence — caller supplies `id` + `noteId`. */
export type AdaptedBlock = Pick<Block, 'type' | 'content' | 'meta' | 'position' | 'parentId'>;

// ── OctoNote → Tiptap JSON ─────────────────────────────────────

export function toTiptap(blocks: Block[]): JSONContent {
  const ordered = [...blocks].sort((a, b) => a.position - b.position);
  const content: JSONContent[] = [];

  let i = 0;
  while (i < ordered.length) {
    const b = ordered[i];

    // Group consecutive list items into a single list wrapper.
    if (b.type === BlockType.Bullet) {
      const items: JSONContent[] = [];
      while (i < ordered.length && ordered[i].type === BlockType.Bullet) {
        items.push(listItem(ordered[i].content));
        i++;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }
    if (b.type === BlockType.Numbered) {
      const items: JSONContent[] = [];
      while (i < ordered.length && ordered[i].type === BlockType.Numbered) {
        items.push(listItem(ordered[i].content));
        i++;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }
    if (b.type === BlockType.Todo) {
      const items: JSONContent[] = [];
      while (i < ordered.length && ordered[i].type === BlockType.Todo) {
        const cur = ordered[i];
        items.push(taskItem(cur.content, Boolean(cur.meta.checked)));
        i++;
      }
      content.push({ type: 'taskList', content: items });
      continue;
    }

    content.push(blockToNode(b));
    i++;
  }

  return { type: 'doc', content };
}

function blockToNode(b: Block): JSONContent {
  switch (b.type) {
    case BlockType.Paragraph:
      return paragraph(b.content);
    case BlockType.Heading:
      return {
        type: 'heading',
        attrs: { level: clampLevel(b.meta.level) },
        ...textInline(b.content),
      };
    case BlockType.Code:
      return {
        type: 'codeBlock',
        attrs: { language: String(b.meta.language || 'text') },
        ...textInline(b.content),
      };
    case BlockType.Quote:
      return { type: 'blockquote', content: [paragraph(b.content)] };
    case BlockType.Divider:
      return { type: 'horizontalRule' };
    case BlockType.Image:
      return {
        type: 'image',
        attrs: { src: b.content, alt: String(b.meta.alt || '') },
      };
    default:
      // callout / embed / diagram / table — fall back for now (phase 3c)
      return paragraph(b.content);
  }
}

function paragraph(text: string): JSONContent {
  return { type: 'paragraph', ...textInline(text) };
}

function listItem(text: string): JSONContent {
  return { type: 'listItem', content: [paragraph(text)] };
}

function taskItem(text: string, checked: boolean): JSONContent {
  return { type: 'taskItem', attrs: { checked }, content: [paragraph(text)] };
}

function textInline(text: string): { content?: JSONContent[] } {
  if (!text) return {};
  return { content: [{ type: 'text', text }] };
}

function clampLevel(level: unknown): 1 | 2 | 3 {
  const n = Number(level);
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

// ── Tiptap JSON → OctoNote ─────────────────────────────────────

export function fromTiptap(doc: JSONContent): AdaptedBlock[] {
  const result: AdaptedBlock[] = [];
  let position = 0;
  const push = (b: Omit<AdaptedBlock, 'position' | 'parentId'>) => {
    result.push({ ...b, position: position++, parentId: null });
  };

  for (const node of doc.content ?? []) {
    walkTop(node, push);
  }
  return result;
}

type PushFn = (b: Omit<AdaptedBlock, 'position' | 'parentId'>) => void;

function walkTop(node: JSONContent, push: PushFn): void {
  const attrs = (node.attrs ?? {}) as Record<string, unknown>;

  switch (node.type) {
    case 'paragraph':
      push({ type: BlockType.Paragraph, content: extractText(node), meta: {} });
      return;
    case 'heading':
      push({
        type: BlockType.Heading,
        content: extractText(node),
        meta: { level: clampLevel(attrs.level) },
      });
      return;
    case 'codeBlock':
      push({
        type: BlockType.Code,
        content: extractText(node),
        meta: { language: String(attrs.language || 'text') },
      });
      return;
    case 'blockquote':
      // Emit each contained paragraph as its own quote block.
      for (const child of node.content ?? []) {
        push({ type: BlockType.Quote, content: extractText(child), meta: {} });
      }
      return;
    case 'horizontalRule':
      push({ type: BlockType.Divider, content: '', meta: {} });
      return;
    case 'image':
      push({
        type: BlockType.Image,
        content: String(attrs.src || ''),
        meta: { alt: String(attrs.alt || '') },
      });
      return;
    case 'bulletList':
      for (const li of node.content ?? []) {
        push({ type: BlockType.Bullet, content: extractListItemText(li), meta: {} });
      }
      return;
    case 'orderedList':
      for (const li of node.content ?? []) {
        push({ type: BlockType.Numbered, content: extractListItemText(li), meta: {} });
      }
      return;
    case 'taskList':
      for (const ti of node.content ?? []) {
        const tiAttrs = (ti.attrs ?? {}) as Record<string, unknown>;
        push({
          type: BlockType.Todo,
          content: extractListItemText(ti),
          meta: { checked: Boolean(tiAttrs.checked) },
        });
      }
      return;
    default:
      // Unknown node — preserve its text as a paragraph.
      push({ type: BlockType.Paragraph, content: extractText(node), meta: {} });
  }
}

function extractText(node: JSONContent): string {
  if (typeof node.text === 'string') return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

function extractListItemText(li: JSONContent): string {
  // listItem / taskItem contain paragraph(s); join their texts with newlines.
  if (!li.content) return '';
  return li.content.map(extractText).join('\n');
}
