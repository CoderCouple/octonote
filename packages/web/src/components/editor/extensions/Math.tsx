import { useMemo, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type MarkdownIt from 'markdown-it';
import katex from 'katex';

// ── Block math: $$ ... $$ ───────────────────────────────────────

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-source') ?? '',
        renderHTML: (attrs) => ({ 'data-source': attrs.source }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { source?: string } },
        ) {
          const src = (node.attrs.source ?? '').trim();
          state.write(`$$\n${src}\n$$`);
          state.closeBlock(node);
        },
        parse: {
          setup(md: MarkdownIt) {
            md.use(blockMathPlugin);
          },
        },
      },
    };
  },
});

function MathBlockView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const source = String((node.attrs as { source?: string }).source ?? '');
  const [showSource, setShowSource] = useState(false);
  const editable = editor.isEditable;

  const { html, error } = useMemo(() => {
    if (!source.trim()) return { html: '', error: null };
    try {
      return {
        html: katex.renderToString(source, { displayMode: true, throwOnError: true, output: 'html' }),
        error: null,
      };
    } catch (e) {
      return { html: '', error: e instanceof Error ? e.message : String(e) };
    }
  }, [source]);

  return (
    <NodeViewWrapper className="math-block" data-type="math-block">
      <div className="math-toolbar" contentEditable={false}>
        <span className="math-label">math</span>
        {editable && (
          <button
            type="button"
            className="math-toggle"
            onClick={() => setShowSource((s) => !s)}
          >
            {showSource ? 'Preview' : 'Edit'}
          </button>
        )}
      </div>
      {showSource && editable ? (
        <textarea
          className="math-source"
          value={source}
          spellCheck={false}
          onChange={(e) => updateAttributes({ source: e.target.value })}
        />
      ) : error ? (
        <div className="math-error" contentEditable={false}>
          KaTeX error: {error}
        </div>
      ) : (
        <div
          className="math-preview"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </NodeViewWrapper>
  );
}

// ── Inline math: $ ... $ ────────────────────────────────────────

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-source') ?? '',
        renderHTML: (attrs) => ({ 'data-source': attrs.source }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const src = (node.attrs as { source?: string }).source ?? '';
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline', class: 'math-inline' }),
      `$${src}$`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void },
          node: { attrs: { source?: string } },
        ) {
          state.write(`$${node.attrs.source ?? ''}$`);
        },
        parse: {
          setup(md: MarkdownIt) {
            md.use(inlineMathPlugin);
          },
        },
      },
    };
  },
});

function MathInlineView({ node }: ReactNodeViewProps) {
  const source = String((node.attrs as { source?: string }).source ?? '');
  const { html, error } = useMemo(() => {
    if (!source) return { html: '', error: null };
    try {
      return {
        html: katex.renderToString(source, { displayMode: false, throwOnError: true, output: 'html' }),
        error: null,
      };
    } catch (e) {
      return { html: '', error: e instanceof Error ? e.message : String(e) };
    }
  }, [source]);

  if (error) {
    return (
      <NodeViewWrapper as="span" className="math-inline math-inline-error">
        ${source}$
      </NodeViewWrapper>
    );
  }
  return (
    <NodeViewWrapper
      as="span"
      className="math-inline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── markdown-it plugins ─────────────────────────────────────────

/** `$$ ... $$` as a standalone paragraph → `mathBlock`. */
function blockMathPlugin(md: MarkdownIt): void {
  md.core.ruler.after('block', 'mathBlock', (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      if (state.tokens[i].type !== 'paragraph_open') continue;
      const inline = state.tokens[i + 1];
      const close = state.tokens[i + 2];
      if (!inline || inline.type !== 'inline' || close?.type !== 'paragraph_close') continue;
      const m = inline.content.match(/^\$\$\s*([\s\S]+?)\s*\$\$$/);
      if (!m) continue;
      const token = new state.Token('mathBlock', 'div', 0);
      token.attrSet('source', m[1]);
      token.block = true;
      state.tokens.splice(i, 3, token);
    }
    return true;
  });
}

/** Inline `$expr$` → `mathInline`. Avoids matching `$N` currency by requiring
 *  no whitespace right after the opening `$` and a non-digit before it. */
function inlineMathPlugin(md: MarkdownIt): void {
  md.inline.ruler.before('escape', 'mathInline', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) return false;
    // Don't trigger on `$$` (that's block math)
    if (state.src.charCodeAt(state.pos + 1) === 0x24) return false;
    // Don't trigger right after a digit/letter (probably currency / variable).
    const prev = state.src.charCodeAt(state.pos - 1);
    if (state.pos > 0 && prev >= 0x30 && prev <= 0x39) return false;

    let i = state.pos + 1;
    if (state.src.charCodeAt(i) === 0x20 || state.src.charCodeAt(i) === 0x0a) {
      return false; // no space right after `$`
    }
    while (i < state.posMax) {
      const ch = state.src.charCodeAt(i);
      if (ch === 0x0a /* \n */) return false;
      if (ch === 0x5c /* \ */) { i += 2; continue; }
      if (ch === 0x24 /* $ */) {
        const before = state.src.charCodeAt(i - 1);
        if (before !== 0x20 && before !== 0x0a) break;
      }
      i++;
    }
    if (i >= state.posMax || state.src.charCodeAt(i) !== 0x24) return false;

    const source = state.src.slice(state.pos + 1, i);
    if (!silent) {
      const token = state.push('mathInline', 'span', 0);
      token.content = source;
      token.attrSet('source', source);
    }
    state.pos = i + 1;
    return true;
  });
}
