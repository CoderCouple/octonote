import { useEffect, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type MarkdownIt from 'markdown-it';
import { Star, GitFork, Github } from 'lucide-react';
import { api, type EmbedResult } from '@/api/client';

/**
 * Atom block rendering a card for a GitHub repo. Markdown round-trip:
 * `[github:owner/repo]` on its own line.
 */
export const GithubCard = Node.create({
  name: 'githubCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      repo: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-repo') ?? '',
        renderHTML: (attrs) => ({ 'data-repo': attrs.repo }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="github-card"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'github-card' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GithubCardView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { repo?: string } },
        ) {
          state.write(`[github:${node.attrs.repo ?? ''}]`);
          state.closeBlock(node);
        },
        parse: {
          setup(md: MarkdownIt) {
            md.use(githubCardPlugin);
          },
        },
      },
    };
  },
});

function GithubCardView({ node }: ReactNodeViewProps) {
  const repo = String((node.attrs as { repo?: string }).repo ?? '');
  const url = `https://github.com/${repo}`;
  const [data, setData] = useState<EmbedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!repo) {
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
  }, [repo, url]);

  const gh = data?.github;

  return (
    <NodeViewWrapper className="embed-card github-card" data-type="github-card" contentEditable={false}>
      <a className="embed-card-link" href={url} target="_blank" rel="noopener noreferrer">
        <div className="embed-card-header">
          {gh?.ownerAvatar ? (
            <img className="github-avatar" src={gh.ownerAvatar} alt="" width={20} height={20} />
          ) : (
            <Github size={16} className="embed-card-icon" />
          )}
          <span className="embed-card-title">{gh?.fullName ?? repo}</span>
        </div>
        {error ? (
          <div className="embed-card-error">{error}</div>
        ) : !data ? (
          <div className="embed-card-loading">Loading…</div>
        ) : (
          <>
            {gh?.description && <p className="embed-card-description">{gh.description}</p>}
            <div className="embed-card-meta">
              {gh?.language && <span className="github-language">{gh.language}</span>}
              {gh && (
                <span className="github-stat">
                  <Star size={12} /> {gh.stars.toLocaleString()}
                </span>
              )}
              {gh && (
                <span className="github-stat">
                  <GitFork size={12} /> {gh.forks.toLocaleString()}
                </span>
              )}
            </div>
          </>
        )}
      </a>
    </NodeViewWrapper>
  );
}

/** Markdown-it plugin: `[github:owner/repo]` on its own line → `githubCard` token. */
function githubCardPlugin(md: MarkdownIt): void {
  md.core.ruler.after('block', 'githubCard', (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      if (state.tokens[i].type !== 'paragraph_open') continue;
      const inline = state.tokens[i + 1];
      const close = state.tokens[i + 2];
      if (!inline || inline.type !== 'inline' || close?.type !== 'paragraph_close') continue;
      const m = inline.content.trim().match(/^\[github:([\w.-]+\/[\w.-]+)\]$/);
      if (!m) continue;
      // Replace the paragraph with a single githubCard token.
      const token = new state.Token('githubCard', 'div', 0);
      token.attrSet('repo', m[1]);
      token.block = true;
      state.tokens.splice(i, 3, token);
    }
    return true;
  });
}
