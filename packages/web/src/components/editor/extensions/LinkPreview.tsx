import { useEffect, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type MarkdownIt from 'markdown-it';
import { Link as LinkIcon } from 'lucide-react';
import { api, type EmbedResult } from '@/api/client';

/**
 * Atom block rendering an Open Graph link preview / bookmark card. Markdown
 * round-trip: `[bookmark:<url>]` on its own line.
 */
export const LinkPreview = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-url') ?? '',
        renderHTML: (attrs) => ({ 'data-url': attrs.url }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="link-preview"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'link-preview' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkPreviewView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { url?: string } },
        ) {
          state.write(`[bookmark:${node.attrs.url ?? ''}]`);
          state.closeBlock(node);
        },
        parse: {
          setup(md: MarkdownIt) {
            md.use(linkPreviewPlugin);
          },
        },
      },
    };
  },
});

function LinkPreviewView({ node }: ReactNodeViewProps) {
  const url = String((node.attrs as { url?: string }).url ?? '');
  const [data, setData] = useState<EmbedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setData(null);
      return;
    }
    api.embed
      .fetch(url)
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [url]);

  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }

  return (
    <NodeViewWrapper className="embed-card link-preview" data-type="link-preview" contentEditable={false}>
      <a className="embed-card-link" href={url} target="_blank" rel="noopener noreferrer">
        <div className="link-preview-inner">
          <div className="link-preview-text">
            <div className="embed-card-header">
              <LinkIcon size={14} className="embed-card-icon" />
              <span className="link-preview-host">{data?.siteName ?? host}</span>
            </div>
            {error ? (
              <div className="embed-card-error">{error}</div>
            ) : !data ? (
              <div className="embed-card-loading">Loading…</div>
            ) : (
              <>
                <div className="embed-card-title">{data.title ?? url}</div>
                {data.description && (
                  <p className="embed-card-description">{data.description}</p>
                )}
              </>
            )}
          </div>
          {data?.image && (
            <img className="link-preview-image" src={data.image} alt="" />
          )}
        </div>
      </a>
    </NodeViewWrapper>
  );
}

/** Markdown-it plugin: `[bookmark:<url>]` on its own line → `linkPreview` token. */
function linkPreviewPlugin(md: MarkdownIt): void {
  md.core.ruler.after('block', 'linkPreview', (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      if (state.tokens[i].type !== 'paragraph_open') continue;
      const inline = state.tokens[i + 1];
      const close = state.tokens[i + 2];
      if (!inline || inline.type !== 'inline' || close?.type !== 'paragraph_close') continue;
      const m = inline.content.trim().match(/^\[bookmark:(https?:\/\/[^\s\]]+)\]$/);
      if (!m) continue;
      const token = new state.Token('linkPreview', 'div', 0);
      token.attrSet('url', m[1]);
      token.block = true;
      state.tokens.splice(i, 3, token);
    }
    return true;
  });
}
