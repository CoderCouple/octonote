import { useEffect, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type MarkdownIt from 'markdown-it';
import { Star, GitFork, Github, Users, Library } from 'lucide-react';
import { api, type EmbedResult } from '@/api/client';

/**
 * Atom block rendering a card for a GitHub repo OR user/org. Markdown
 * round-trip: `[github:owner]` or `[github:owner/repo]` on its own line.
 */
export const GithubCard = Node.create({
  name: 'githubCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      // Stored as `owner` or `owner/repo`; the server figures out which.
      target: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-target') ?? '',
        renderHTML: (attrs) => ({ 'data-target': attrs.target }),
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
          node: { attrs: { target?: string } },
        ) {
          state.write(`[github:${node.attrs.target ?? ''}]`);
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
  const target = String((node.attrs as { target?: string }).target ?? '');
  const url = `https://github.com/${target}`;
  const [data, setData] = useState<EmbedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!target) {
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
  }, [target, url]);

  return (
    <NodeViewWrapper className="embed-card github-card" data-type="github-card" contentEditable={false}>
      <a className="embed-card-link" href={url} target="_blank" rel="noopener noreferrer">
        {renderBody(target, data, error)}
      </a>
    </NodeViewWrapper>
  );
}

function renderBody(target: string, data: EmbedResult | null, error: string | null) {
  if (error) {
    return (
      <>
        <div className="embed-card-header">
          <Github size={16} className="embed-card-icon" />
          <span className="embed-card-title">{target}</span>
        </div>
        <div className="embed-card-error">{error}</div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <div className="embed-card-header">
          <Github size={16} className="embed-card-icon" />
          <span className="embed-card-title">{target}</span>
        </div>
        <div className="embed-card-loading">Loading…</div>
      </>
    );
  }

  const gh = data.github;
  if (!gh) return <div className="embed-card-loading">No data</div>;

  if (gh.kind === 'user') {
    return (
      <>
        <div className="embed-card-header">
          {gh.avatar ? (
            <img className="github-avatar" src={gh.avatar} alt="" width={20} height={20} />
          ) : (
            <Github size={16} className="embed-card-icon" />
          )}
          <span className="embed-card-title">{gh.name ?? gh.login}</span>
          {gh.name && <span className="github-login">@{gh.login}</span>}
        </div>
        {gh.bio && <p className="embed-card-description">{gh.bio}</p>}
        <div className="embed-card-meta">
          <span className="github-stat"><Library size={12} /> {gh.publicRepos.toLocaleString()} repos</span>
          <span className="github-stat"><Users size={12} /> {gh.followers.toLocaleString()} followers</span>
          {gh.company && <span className="github-stat">{gh.company}</span>}
        </div>
      </>
    );
  }

  // repo
  return (
    <>
      <div className="embed-card-header">
        {gh.ownerAvatar ? (
          <img className="github-avatar" src={gh.ownerAvatar} alt="" width={20} height={20} />
        ) : (
          <Github size={16} className="embed-card-icon" />
        )}
        <span className="embed-card-title">{gh.fullName}</span>
      </div>
      {gh.description && <p className="embed-card-description">{gh.description}</p>}
      <div className="embed-card-meta">
        {gh.language && <span className="github-language">{gh.language}</span>}
        <span className="github-stat"><Star size={12} /> {gh.stars.toLocaleString()}</span>
        <span className="github-stat"><GitFork size={12} /> {gh.forks.toLocaleString()}</span>
      </div>
    </>
  );
}

/** Markdown-it plugin: `[github:owner]` or `[github:owner/repo]` on its own
 *  line → `githubCard` token. */
function githubCardPlugin(md: MarkdownIt): void {
  md.core.ruler.after('block', 'githubCard', (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      if (state.tokens[i].type !== 'paragraph_open') continue;
      const inline = state.tokens[i + 1];
      const close = state.tokens[i + 2];
      if (!inline || inline.type !== 'inline' || close?.type !== 'paragraph_close') continue;
      const m = inline.content.trim().match(/^\[github:([\w.-]+(?:\/[\w.-]+)?)\]$/);
      if (!m) continue;
      const token = new state.Token('githubCard', 'div', 0);
      token.attrSet('target', m[1]);
      token.block = true;
      state.tokens.splice(i, 3, token);
    }
    return true;
  });
}
