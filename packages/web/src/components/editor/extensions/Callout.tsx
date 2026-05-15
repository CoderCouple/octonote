import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type MarkdownIt from 'markdown-it';

/**
 * Container block. Renders as a styled box with an emoji icon. Round-trips as
 * a GitHub-style alert: `> [!CALLOUT 💡]` + blockquote content.
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      icon: {
        default: '💡',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-icon') ?? '💡',
        renderHTML: (attrs) => ({ 'data-icon': attrs.icon }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'callout' }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs?: { icon?: string }) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { icon: attrs?.icon ?? '💡' }),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: {
            write: (s: string) => void;
            wrapBlock: (
              delim: string,
              firstDelim: string | null,
              node: unknown,
              cb: () => void,
            ) => void;
            renderContent: (node: unknown) => void;
            closeBlock: (node: unknown) => void;
          },
          node: { attrs: { icon?: string } },
        ) {
          const icon = node.attrs.icon ? ` ${node.attrs.icon}` : '';
          state.write(`> [!CALLOUT${icon}]\n`);
          state.wrapBlock('> ', null, node, () => state.renderContent(node));
          state.closeBlock(node);
        },
        parse: {
          setup(md: MarkdownIt) {
            md.use(calloutPlugin);
          },
        },
      },
    };
  },
});

function CalloutView({ node }: ReactNodeViewProps) {
  const icon = (node.attrs as { icon?: string }).icon ?? '💡';
  return (
    <NodeViewWrapper className="callout" data-type="callout">
      <span className="callout-icon" contentEditable={false}>
        {icon}
      </span>
      <NodeViewContent className="callout-content" />
    </NodeViewWrapper>
  );
}

/**
 * markdown-it plugin: any blockquote whose first inline content starts with
 * `[!CALLOUT (icon)]` is retagged as a `callout_open` / `callout_close` pair
 * (with the header line stripped). tiptap-markdown maps those tokens to the
 * `callout` node by name.
 */
function calloutPlugin(md: MarkdownIt): void {
  md.core.ruler.after('block', 'callout', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') continue;

      // find matching close
      let depth = 1;
      let close = -1;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'blockquote_open') depth++;
        if (tokens[j].type === 'blockquote_close') {
          depth--;
          if (depth === 0) { close = j; break; }
        }
      }
      if (close === -1) continue;

      // Look at the inline content of the first paragraph inside the quote.
      // Token sequence: blockquote_open, paragraph_open, inline, paragraph_close, ...
      const inline = tokens[i + 2];
      if (!inline || inline.type !== 'inline') continue;

      const match = inline.content.match(/^\[!CALLOUT(?:\s+([^\]\n]+))?\]\s*\n?([\s\S]*)$/);
      if (!match) continue;

      const icon = (match[1] ?? '').trim();
      const rest = match[2] ?? '';

      // Retag the wrapper as callout.
      tokens[i].type = 'callout_open';
      tokens[i].tag = 'div';
      if (icon) tokens[i].attrSet('icon', icon);
      tokens[close].type = 'callout_close';
      tokens[close].tag = 'div';

      // Strip the header line from the inline content (and reparse children).
      inline.content = rest;
      const reparsed = md.parseInline(rest, state.env)[0];
      inline.children = reparsed?.children ?? [];

      // If `rest` is empty, drop the now-empty leading paragraph entirely.
      if (rest.trim() === '') {
        tokens.splice(i + 1, 3); // paragraph_open, inline, paragraph_close
        // Adjust close index
        close -= 3;
      }
    }
    return true;
  });
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { icon?: string }) => ReturnType;
    };
  }
}
