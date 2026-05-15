import { BlockType } from '@/types';
import type { Block as OctoBlock } from '@/types';
import type { Block as BNBlock, PartialBlock } from '@blocknote/core';

/**
 * Bidirectional adapter between OctoNote's block model and BlockNote's.
 *
 * OctoNote blocks are flat (ordered by `position`); BlockNote blocks form a
 * tree. This adapter works flat — on the way back, nested BlockNote blocks are
 * flattened depth-first and `parentId` is dropped.
 *
 * Inline formatting: OctoNote stores `content` as plain text, so inline marks
 * (bold / italic / links) added in BlockNote are flattened to plain text on
 * save.
 *
 * `callout` / `embed` / `diagram` / `table` have no BlockNote default block and
 * are mapped to paragraphs for now — proper custom blocks land in phase 3c.
 */

/** Block shape produced for persistence — caller supplies `id` + `noteId`. */
export type AdaptedBlock = Pick<OctoBlock, 'type' | 'content' | 'meta' | 'position' | 'parentId'>;

// ── OctoNote → BlockNote ───────────────────────────────────────────────────

export function toBlockNote(blocks: OctoBlock[]): PartialBlock[] {
  return [...blocks]
    .sort((a, b) => a.position - b.position)
    .map(octoBlockToBlockNote);
}

function octoBlockToBlockNote(b: OctoBlock): PartialBlock {
  switch (b.type) {
    case BlockType.Paragraph:
      return { type: 'paragraph', content: b.content };
    case BlockType.Heading: {
      const level = clampHeadingLevel(Number(b.meta.level) || 1);
      return { type: 'heading', props: { level }, content: b.content };
    }
    case BlockType.Bullet:
      return { type: 'bulletListItem', content: b.content };
    case BlockType.Numbered:
      return { type: 'numberedListItem', content: b.content };
    case BlockType.Todo:
      return {
        type: 'checkListItem',
        props: { checked: Boolean(b.meta.checked) },
        content: b.content,
      };
    case BlockType.Code:
      return {
        type: 'codeBlock',
        props: { language: String(b.meta.language || 'text') },
        content: b.content,
      };
    case BlockType.Quote:
      return { type: 'quote', content: b.content };
    case BlockType.Divider:
      return { type: 'divider' };
    case BlockType.Image:
      return {
        type: 'image',
        props: { url: b.content, caption: String(b.meta.alt || '') },
      };
    // callout / embed / diagram / table — no BlockNote default yet (phase 3c)
    default:
      return { type: 'paragraph', content: b.content };
  }
}

// ── BlockNote → OctoNote ───────────────────────────────────────────────────

export function fromBlockNote(blocks: BNBlock[]): AdaptedBlock[] {
  const result: AdaptedBlock[] = [];
  let position = 0;

  const walk = (list: BNBlock[]) => {
    for (const bn of list) {
      const mapped = blockNoteBlockToOcto(bn);
      result.push({ ...mapped, position: position++, parentId: null });
      if (bn.children?.length) walk(bn.children);
    }
  };
  walk(blocks);
  return result;
}

function blockNoteBlockToOcto(bn: BNBlock): Pick<OctoBlock, 'type' | 'content' | 'meta'> {
  const text = extractText(bn);
  const props = (bn.props ?? {}) as Record<string, unknown>;

  switch (bn.type) {
    case 'paragraph':
      return { type: BlockType.Paragraph, content: text, meta: {} };
    case 'heading':
      return {
        type: BlockType.Heading,
        content: text,
        meta: { level: clampHeadingLevel(Number(props.level) || 1) },
      };
    case 'bulletListItem':
      return { type: BlockType.Bullet, content: text, meta: {} };
    case 'numberedListItem':
      return { type: BlockType.Numbered, content: text, meta: {} };
    case 'checkListItem':
      return { type: BlockType.Todo, content: text, meta: { checked: Boolean(props.checked) } };
    case 'codeBlock':
      return {
        type: BlockType.Code,
        content: text,
        meta: { language: String(props.language || 'text') },
      };
    case 'quote':
      return { type: BlockType.Quote, content: text, meta: {} };
    case 'divider':
      return { type: BlockType.Divider, content: '', meta: {} };
    case 'image':
      return {
        type: BlockType.Image,
        content: String(props.url || ''),
        meta: { alt: String(props.caption || '') },
      };
    default:
      return { type: BlockType.Paragraph, content: text, meta: {} };
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function clampHeadingLevel(level: number): 1 | 2 | 3 {
  if (level <= 1) return 1;
  if (level >= 3) return 3;
  return 2;
}

/** Flatten a BlockNote block's inline content to plain text. */
function extractText(bn: BNBlock): string {
  const content = (bn as { content?: unknown }).content;
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((item: any) => {
      if (item?.type === 'text') return String(item.text ?? '');
      if (item?.type === 'link') {
        return (item.content ?? [])
          .map((c: any) => String(c?.text ?? ''))
          .join('');
      }
      return '';
    })
    .join('');
}
