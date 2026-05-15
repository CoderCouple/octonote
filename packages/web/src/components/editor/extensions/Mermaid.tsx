import { useEffect, useId, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type MarkdownIt from 'markdown-it';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });

/**
 * Leaf block containing Mermaid source. The NodeView renders a live SVG
 * preview and a "show source" toggle. Round-trips as a ```mermaid code fence.
 */
export const Mermaid = Node.create({
  name: 'mermaid',
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
    return [{ tag: 'div[data-type="mermaid"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { source?: string } },
        ) {
          const src = node.attrs.source ?? '';
          state.write('```mermaid\n');
          state.write(src);
          state.write(src.endsWith('\n') ? '```' : '\n```');
          state.closeBlock(node);
        },
        parse: {
          setup(md: MarkdownIt) {
            md.use(mermaidPlugin);
          },
        },
      },
    };
  },
});

function MermaidView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const source = String((node.attrs as { source?: string }).source ?? '');
  const [showSource, setShowSource] = useState(false);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, '');
  const editable = editor.isEditable;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!source.trim()) {
      setSvg('');
      setError(null);
      return;
    }
    mermaid
      .render(`mermaid-${id}`, source)
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSvg('');
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  return (
    <NodeViewWrapper className="mermaid-block" data-type="mermaid">
      <div className="mermaid-toolbar" contentEditable={false}>
        <span className="mermaid-label">mermaid</span>
        {editable && (
          <button
            type="button"
            className="mermaid-toggle"
            onClick={() => setShowSource((s) => !s)}
          >
            {showSource ? 'Preview' : 'Edit source'}
          </button>
        )}
      </div>
      {showSource && editable ? (
        <textarea
          ref={textareaRef}
          className="mermaid-source"
          value={source}
          spellCheck={false}
          onChange={(e) => updateAttributes({ source: e.target.value })}
        />
      ) : error ? (
        <div className="mermaid-error" contentEditable={false}>
          <strong>Mermaid syntax error:</strong> {error}
        </div>
      ) : (
        <div
          className="mermaid-preview"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </NodeViewWrapper>
  );
}

/**
 * markdown-it plugin: retag fenced code blocks with info `mermaid` as
 * `mermaid` tokens so tiptap-markdown maps them to the mermaid node.
 * The mermaid source is captured via the token's `content`; we read it into
 * the node's `source` attribute through tiptap-markdown's getAttrs.
 */
function mermaidPlugin(md: MarkdownIt): void {
  md.core.ruler.after('block', 'mermaid', (state) => {
    for (const token of state.tokens) {
      if (token.type === 'fence' && (token.info ?? '').trim() === 'mermaid') {
        token.type = 'mermaid';
        token.tag = 'div';
        token.attrSet('source', token.content ?? '');
      }
    }
    return true;
  });
}
