import { marked, type Tokens, type TokensList } from 'marked';
import { BlockType } from '@/types';
import type { Block } from '@/types';

/**
 * Adapter between OctoNote's flat block model and a single markdown string.
 *
 * The editor uses `tiptap-markdown`, which lets Tiptap accept/emit markdown
 * directly — so this adapter assembles a markdown document from blocks on
 * load, and tokenizes the markdown back into blocks on save. `marked`
 * handles the block-level tokenization; inline markdown (bold/italic/code
 * /link) survives as plain text inside each block's `content` (matching
 * how the CLI / core / brain hook already store it).
 */

/** Block shape produced for persistence — caller supplies `id` + `noteId`. */
export type AdaptedBlock = Pick<Block, 'type' | 'content' | 'meta' | 'position' | 'parentId'>;

// ── OctoNote blocks → markdown ─────────────────────────────────

export function blocksToMarkdown(blocks: Block[]): string {
  return [...blocks]
    .sort((a, b) => a.position - b.position)
    .map(renderBlock)
    .join('\n\n');
}

function renderBlock(b: Block): string {
  switch (b.type) {
    case BlockType.Paragraph:
      return b.content;
    case BlockType.Heading: {
      const level = clampLevel(b.meta.level);
      return `${'#'.repeat(level)} ${b.content}`;
    }
    case BlockType.Bullet:
      return `- ${b.content}`;
    case BlockType.Numbered:
      return `1. ${b.content}`;
    case BlockType.Todo: {
      const checked = b.meta.checked ? 'x' : ' ';
      return `- [${checked}] ${b.content}`;
    }
    case BlockType.Code: {
      const lang = String(b.meta.language || '');
      return `\`\`\`${lang}\n${b.content}\n\`\`\``;
    }
    case BlockType.Quote:
      return b.content
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    case BlockType.Divider:
      return '---';
    case BlockType.Image: {
      const alt = String(b.meta.alt || '');
      return `![${alt}](${b.content})`;
    }
    case BlockType.Callout: {
      // GitHub-style alert + optional icon: `> [!CALLOUT 💡]` then content.
      const icon = b.meta.icon ? String(b.meta.icon) : '';
      const header = icon ? `[!CALLOUT ${icon}]` : `[!CALLOUT]`;
      const lines = [`> ${header}`, ...b.content.split('\n').map((l) => `> ${l}`)];
      return lines.join('\n');
    }
    case BlockType.Embed:
      // Block-level wikilink — its own paragraph so `markdownToBlocks` recognises it.
      return `[[${b.content}]]`;
    case BlockType.Diagram: {
      const kind = String(b.meta.diagramType || 'mermaid');
      return `\`\`\`${kind}\n${b.content}\n\`\`\``;
    }
    default:
      return b.content;
  }
}

// ── Markdown → OctoNote blocks ─────────────────────────────────

export function markdownToBlocks(md: string): AdaptedBlock[] {
  const tokens = marked.lexer(md) as TokensList;
  const result: AdaptedBlock[] = [];
  let position = 0;

  const push = (b: Omit<AdaptedBlock, 'position' | 'parentId'>) => {
    result.push({ ...b, position: position++, parentId: null });
  };

  for (const token of tokens) {
    handleToken(token, push);
  }
  return result;
}

type PushFn = (b: Omit<AdaptedBlock, 'position' | 'parentId'>) => void;

function handleToken(t: Tokens.Generic, push: PushFn): void {
  switch (t.type) {
    case 'paragraph': {
      const p = t as Tokens.Paragraph;
      // Block-level wikilink: a paragraph whose entire text is `[[Note Name]]`
      const embedMatch = p.text.trim().match(/^\[\[([^\]\n]+)\]\]$/);
      if (embedMatch) {
        push({ type: BlockType.Embed, content: embedMatch[1], meta: {} });
        return;
      }
      push({ type: BlockType.Paragraph, content: p.text, meta: {} });
      return;
    }
    case 'heading': {
      const h = t as Tokens.Heading;
      push({
        type: BlockType.Heading,
        content: h.text,
        meta: { level: clampLevel(h.depth) },
      });
      return;
    }
    case 'list': {
      const list = t as Tokens.List;
      for (const item of list.items) {
        const text = item.text.replace(/\s+$/, '');
        if (item.task) {
          push({
            type: BlockType.Todo,
            content: stripTaskMarker(text),
            meta: { checked: !!item.checked },
          });
        } else if (list.ordered) {
          push({ type: BlockType.Numbered, content: text, meta: {} });
        } else {
          push({ type: BlockType.Bullet, content: text, meta: {} });
        }
      }
      return;
    }
    case 'code': {
      const code = t as Tokens.Code;
      // Diagram code-fences (mermaid for now) → BlockType.Diagram.
      if (code.lang === 'mermaid') {
        push({
          type: BlockType.Diagram,
          content: code.text,
          meta: { diagramType: 'mermaid' },
        });
        return;
      }
      push({
        type: BlockType.Code,
        content: code.text,
        meta: { language: code.lang || 'text' },
      });
      return;
    }
    case 'blockquote': {
      const bq = t as Tokens.Blockquote;
      const text = bq.text.replace(/\s+$/, '');
      // GitHub-style callout: first line is `[!CALLOUT (icon?)]`
      const lines = text.split('\n');
      const header = lines[0]?.match(/^\[!CALLOUT(?:\s+(.+))?\]$/);
      if (header) {
        const icon = (header[1] ?? '').trim();
        const content = lines.slice(1).join('\n');
        push({
          type: BlockType.Callout,
          content,
          meta: icon ? { icon } : {},
        });
        return;
      }
      push({ type: BlockType.Quote, content: text, meta: {} });
      return;
    }
    case 'hr':
      push({ type: BlockType.Divider, content: '', meta: {} });
      return;
    case 'space':
    case 'def':
      return;
    case 'html': {
      const html = t as Tokens.HTML;
      if (html.text) {
        push({ type: BlockType.Paragraph, content: html.text, meta: {} });
      }
      return;
    }
    default: {
      const text = 'text' in t && typeof t.text === 'string' ? t.text : '';
      if (text) push({ type: BlockType.Paragraph, content: text, meta: {} });
    }
  }
}

// ── helpers ────────────────────────────────────────────────────

function clampLevel(level: unknown): 1 | 2 | 3 {
  const n = Number(level);
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

/** `marked` sometimes leaves the `[ ] ` / `[x] ` prefix in `item.text`. Strip it. */
function stripTaskMarker(text: string): string {
  return text.replace(/^\[[ xX]\]\s+/, '');
}
