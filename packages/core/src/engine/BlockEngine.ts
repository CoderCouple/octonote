import { marked, Token } from 'marked';
import matter from 'gray-matter';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { Block, BlockType } from '../models/types';

export class BlockEngine {
  /**
   * Parse markdown string into Block array.
   * Handles YAML frontmatter via gray-matter (returned as metadata, not blocks).
   */
  parseMarkdown(markdown: string, noteId: string = ''): { blocks: Block[]; frontmatter: Record<string, unknown> } {
    const { content, data: frontmatter } = matter(markdown);
    const tokens = marked.lexer(content);
    const blocks: Block[] = [];
    let position = 0;

    for (const token of tokens) {
      const parsed = this.tokenToBlocks(token, noteId, position);
      for (const block of parsed) {
        block.position = position++;
        blocks.push(block);
      }
    }

    return { blocks, frontmatter };
  }

  /**
   * Convert Block array back to markdown string.
   */
  serializeToMarkdown(blocks: Block[], frontmatter?: Record<string, unknown>): string {
    const lines: string[] = [];

    for (const block of blocks) {
      lines.push(this.blockToMarkdown(block));
    }

    const body = lines.join('\n\n');
    if (frontmatter && Object.keys(frontmatter).length > 0) {
      return matter.stringify(body, frontmatter);
    }
    return body;
  }

  /**
   * Render blocks as chalk-colored terminal output.
   */
  renderForTerminal(blocks: Block[]): string {
    const lines: string[] = [];

    for (const block of blocks) {
      lines.push(this.blockToTerminal(block));
    }

    return lines.join('\n\n');
  }

  // ── Token → Block mapping ─────────────────────────────

  private tokenToBlocks(token: Token, noteId: string, _pos: number): Block[] {
    const makeBlock = (type: BlockType, content: string, meta: Record<string, unknown> = {}): Block => ({
      id: uuidv4(),
      noteId,
      type,
      content,
      meta,
      position: 0,
      parentId: null,
    });

    switch (token.type) {
      case 'heading':
        return [makeBlock(BlockType.Heading, token.text, { level: token.depth })];

      case 'paragraph':
        return [makeBlock(BlockType.Paragraph, token.text)];

      case 'code':
        return [makeBlock(BlockType.Code, token.text, { lang: token.lang || '' })];

      case 'blockquote': {
        const innerText = token.text ?? '';
        // Check for callout syntax: > [!type] content
        const calloutMatch = innerText.match(/^\[!(\w+)\]\s*(.*)/s);
        if (calloutMatch) {
          return [makeBlock(BlockType.Callout, calloutMatch[2], { calloutType: calloutMatch[1] })];
        }
        return [makeBlock(BlockType.Quote, innerText)];
      }

      case 'list': {
        const blocks: Block[] = [];
        if (token.ordered) {
          for (const item of token.items) {
            blocks.push(makeBlock(BlockType.Numbered, item.text, { start: token.start }));
          }
        } else {
          for (const item of token.items) {
            if (item.task) {
              blocks.push(makeBlock(BlockType.Todo, item.text, { checked: item.checked }));
            } else {
              blocks.push(makeBlock(BlockType.Bullet, item.text));
            }
          }
        }
        return blocks;
      }

      case 'hr':
        return [makeBlock(BlockType.Divider, '')];

      case 'table': {
        const rows = [token.header.map((h: any) => h.text), ...token.rows.map((r: any[]) => r.map((c: any) => c.text))];
        return [makeBlock(BlockType.Table, JSON.stringify(rows), { align: token.align })];
      }

      case 'html': {
        // Check for image tags
        const imgMatch = token.text.match(/<img[^>]+src="([^"]+)"[^>]*>/);
        if (imgMatch) {
          const altMatch = token.text.match(/alt="([^"]*)"/);
          return [makeBlock(BlockType.Image, imgMatch[1], { alt: altMatch?.[1] ?? '' })];
        }
        return [makeBlock(BlockType.Paragraph, token.text)];
      }

      case 'space':
        return [];

      default:
        // Fallback: treat unknown tokens as paragraphs
        if ('text' in token && typeof (token as any).text === 'string') {
          return [makeBlock(BlockType.Paragraph, (token as any).text)];
        }
        return [];
    }
  }

  // ── Block → Markdown ──────────────────────────────────

  private blockToMarkdown(block: Block): string {
    switch (block.type) {
      case BlockType.Heading: {
        const level = (block.meta.level as number) || 1;
        return '#'.repeat(level) + ' ' + block.content;
      }
      case BlockType.Paragraph:
        return block.content;
      case BlockType.Bullet:
        return `- ${block.content}`;
      case BlockType.Numbered:
        return `1. ${block.content}`;
      case BlockType.Todo: {
        const checked = block.meta.checked ? 'x' : ' ';
        return `- [${checked}] ${block.content}`;
      }
      case BlockType.Code: {
        const lang = (block.meta.lang as string) || '';
        return '```' + lang + '\n' + block.content + '\n```';
      }
      case BlockType.Quote:
        return block.content.split('\n').map(l => `> ${l}`).join('\n');
      case BlockType.Callout: {
        const ct = (block.meta.calloutType as string) || 'info';
        return `> [!${ct}] ${block.content}`;
      }
      case BlockType.Divider:
        return '---';
      case BlockType.Image: {
        const alt = (block.meta.alt as string) || '';
        return `![${alt}](${block.content})`;
      }
      case BlockType.Embed:
        return `![[${block.content}]]`;
      case BlockType.Table: {
        const rows: string[][] = JSON.parse(block.content);
        if (rows.length === 0) return '';
        const header = '| ' + rows[0].join(' | ') + ' |';
        const sep = '| ' + rows[0].map(() => '---').join(' | ') + ' |';
        const body = rows.slice(1).map(r => '| ' + r.join(' | ') + ' |').join('\n');
        return [header, sep, body].filter(Boolean).join('\n');
      }
      default:
        return block.content;
    }
  }

  // ── Block → Terminal ──────────────────────────────────

  private blockToTerminal(block: Block): string {
    switch (block.type) {
      case BlockType.Heading: {
        const level = (block.meta.level as number) || 1;
        const text = block.content;
        if (level === 1) return chalk.bold.cyan(text);
        if (level === 2) return chalk.bold.blue(text);
        return chalk.bold(text);
      }
      case BlockType.Paragraph:
        return block.content;
      case BlockType.Bullet:
        return `  ${chalk.yellow('•')} ${block.content}`;
      case BlockType.Numbered:
        return `  ${chalk.yellow((block.position + 1).toString() + '.')} ${block.content}`;
      case BlockType.Todo: {
        const check = block.meta.checked ? chalk.green('✓') : chalk.gray('○');
        const text = block.meta.checked ? chalk.strikethrough(block.content) : block.content;
        return `  ${check} ${text}`;
      }
      case BlockType.Code: {
        const lang = block.meta.lang ? chalk.dim(` ${block.meta.lang}`) : '';
        const border = chalk.dim('│ ');
        const codeLines = block.content.split('\n').map(l => border + chalk.green(l)).join('\n');
        return chalk.dim('┌──') + lang + '\n' + codeLines + '\n' + chalk.dim('└──');
      }
      case BlockType.Quote:
        return block.content.split('\n').map(l => chalk.dim('│ ') + chalk.italic(l)).join('\n');
      case BlockType.Callout: {
        const ct = (block.meta.calloutType as string) || 'info';
        return chalk.bgBlue.white(` ${ct.toUpperCase()} `) + ' ' + block.content;
      }
      case BlockType.Divider:
        return chalk.dim('─'.repeat(40));
      case BlockType.Image:
        return chalk.dim(`[Image: ${block.meta.alt || block.content}]`);
      case BlockType.Embed:
        return chalk.magenta(`↗ ${block.content}`);
      case BlockType.Table: {
        const rows: string[][] = JSON.parse(block.content);
        if (rows.length === 0) return '';
        const colWidths = rows[0].map((_, ci) => Math.max(...rows.map(r => (r[ci] || '').length)));
        const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
        const header = chalk.bold(rows[0].map((c, i) => pad(c, colWidths[i])).join(' │ '));
        const sep = chalk.dim(colWidths.map(w => '─'.repeat(w)).join('─┼─'));
        const body = rows.slice(1).map(r => r.map((c, i) => pad(c, colWidths[i])).join(' │ ')).join('\n');
        return [header, sep, body].filter(Boolean).join('\n');
      }
      default:
        return block.content;
    }
  }
}
