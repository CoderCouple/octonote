import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type MarkdownIt from 'markdown-it';

/**
 * Inline wikilink: `[[Note Name]]`. Typing `[[…]]` in the editor converts
 * automatically. Round-trips as the same `[[…]]` syntax in markdown.
 */
export const Wikilink = Node.create({
  name: 'wikilink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      target: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-target') ?? '',
        renderHTML: (attrs) => ({ 'data-target': attrs.target }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="wikilink"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const target = (node.attrs as { target?: string }).target ?? '';
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'wikilink',
        href: `/notes/${encodeURIComponent(target)}`,
        class: 'wikilink',
      }),
      `[[${target}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikilinkView);
  },

  addInputRules() {
    // Type `[[Foo]]` → wikilink. Trigger fires when the closing `]]` is typed.
    return [
      new InputRule({
        find: /\[\[([^\]\n]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const target = match[1];
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ target }),
          );
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void },
          node: { attrs: { target?: string } },
        ) {
          state.write(`[[${node.attrs.target ?? ''}]]`);
        },
        parse: {
          setup(md: MarkdownIt) {
            md.use(wikilinkPlugin);
          },
        },
      },
    };
  },
});

function WikilinkView({ node }: ReactNodeViewProps) {
  const target = (node.attrs as { target?: string }).target ?? '';
  return (
    <NodeViewWrapper as="span" className="wikilink-wrapper">
      <a
        className="wikilink"
        href={`/notes/${encodeURIComponent(target)}`}
        onClick={(e) => {
          // Don't navigate when inside the editor; let users edit normally.
          // The link works when the note is read-only / rendered elsewhere.
          e.preventDefault();
        }}
      >
        {target}
      </a>
    </NodeViewWrapper>
  );
}

/** markdown-it inline plugin: parse `[[target]]` as a wikilink token. */
function wikilinkPlugin(md: MarkdownIt): void {
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x5b /* [ */) return false;
    if (state.src.charCodeAt(state.pos + 1) !== 0x5b /* [ */) return false;
    const close = state.src.indexOf(']]', state.pos + 2);
    if (close === -1) return false;
    const target = state.src.slice(state.pos + 2, close);
    if (target.length === 0 || target.includes('\n') || target.includes('[')) {
      return false;
    }
    if (!silent) {
      const token = state.push('wikilink', '', 0);
      token.content = target;
      token.attrSet('target', target);
    }
    state.pos = close + 2;
    return true;
  });
}
