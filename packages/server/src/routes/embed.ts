import { Router } from 'express';
import * as https from 'https';
import * as http from 'http';

export type GithubRepoCard = {
  kind: 'repo';
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  forks: number;
  homepage: string | null;
  ownerAvatar: string | null;
};

export type GithubUserCard = {
  kind: 'user';
  login: string;
  name: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  company: string | null;
  blog: string | null;
  avatar: string | null;
};

export interface EmbedResult {
  url: string;
  type: 'github' | 'link';
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  github?: GithubRepoCard | GithubUserCard;
}

// In-memory LRU-ish cache with TTL. Good enough for this scale.
const cache = new Map<string, { value: EmbedResult; expires: number }>();
const TTL_MS = 60 * 60 * 1000; // 1h
const MAX_ENTRIES = 500;

function getCached(url: string): EmbedResult | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(url);
    return null;
  }
  // Bump LRU order
  cache.delete(url);
  cache.set(url, entry);
  return entry.value;
}

function setCached(url: string, value: EmbedResult): void {
  cache.set(url, { value, expires: Date.now() + TTL_MS });
  while (cache.size > MAX_ENTRIES) {
    const first = cache.keys().next().value;
    if (first === undefined) break;
    cache.delete(first);
  }
}

/** GET /api/embed?url=<url> — returns metadata for embedding. */
export function embedRouter(): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const url = typeof req.query.url === 'string' ? req.query.url : '';
      if (!url || !/^https?:\/\//.test(url)) {
        res.status(400).json({ error: 'url query parameter is required and must be http(s)' });
        return;
      }

      const cached = getCached(url);
      if (cached) {
        res.json(cached);
        return;
      }

      const ghRepo = url.match(/^https:\/\/github\.com\/([^/?#]+)\/([^/?#]+)\/?$/);
      if (ghRepo) {
        const result = await fetchGithubRepo(url, ghRepo[1], ghRepo[2]);
        if (!result) {
          res.status(502).json({ error: 'could not fetch github repo' });
          return;
        }
        setCached(url, result);
        res.json(result);
        return;
      }

      const ghUser = url.match(/^https:\/\/github\.com\/([^/?#]+)\/?$/);
      if (ghUser) {
        const result = await fetchGithubUser(url, ghUser[1]);
        if (!result) {
          res.status(502).json({ error: 'could not fetch github user' });
          return;
        }
        setCached(url, result);
        res.json(result);
        return;
      }

      const html = await fetchText(url, 5000);
      if (!html) {
        res.status(502).json({ error: 'could not fetch url' });
        return;
      }
      const result: EmbedResult = {
        url,
        type: 'link',
        title: extractOg(html, 'title') ?? extractTag(html, 'title'),
        description: extractOg(html, 'description') ?? extractMeta(html, 'description'),
        image: extractOg(html, 'image'),
        siteName: extractOg(html, 'site_name'),
      };
      setCached(url, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// ── GitHub API helper ───────────────────────────────────────────

interface GithubRepo {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  forks_count: number;
  homepage: string | null;
  owner: { avatar_url: string } | null;
  message?: string;
}

interface GithubUser {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  company: string | null;
  blog: string | null;
  avatar_url: string | null;
  message?: string;
}

async function fetchGithubRepo(url: string, owner: string, repo: string): Promise<EmbedResult | null> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const raw = await fetchJson(apiUrl);
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as unknown as GithubRepo;
  if (data.message) return null;
  return {
    url,
    type: 'github',
    title: data.full_name,
    description: data.description ?? undefined,
    siteName: 'GitHub',
    github: {
      kind: 'repo',
      fullName: data.full_name,
      description: data.description ?? null,
      stars: data.stargazers_count ?? 0,
      language: data.language ?? null,
      forks: data.forks_count ?? 0,
      homepage: data.homepage ?? null,
      ownerAvatar: data.owner?.avatar_url ?? null,
    },
  };
}

async function fetchGithubUser(url: string, login: string): Promise<EmbedResult | null> {
  const apiUrl = `https://api.github.com/users/${login}`;
  const raw = await fetchJson(apiUrl);
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as unknown as GithubUser;
  if (data.message) return null;
  return {
    url,
    type: 'github',
    title: data.name ?? data.login,
    description: data.bio ?? undefined,
    siteName: 'GitHub',
    github: {
      kind: 'user',
      login: data.login,
      name: data.name ?? null,
      bio: data.bio ?? null,
      publicRepos: data.public_repos ?? 0,
      followers: data.followers ?? 0,
      company: data.company ?? null,
      blog: data.blog ?? null,
      avatar: data.avatar_url ?? null,
    },
  };
}

// ── HTML extractors ─────────────────────────────────────────────

function extractOg(html: string, prop: string): string | undefined {
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']og:${prop}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m1 = html.match(re1);
  if (m1) return decodeHtml(m1[1]);
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:${prop}["']`,
    'i',
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtml(m2[1]) : undefined;
}

function extractMeta(html: string, name: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  return m ? decodeHtml(m[1]) : undefined;
}

function extractTag(html: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const m = html.match(re);
  return m ? decodeHtml(m[1].trim()) : undefined;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

// ── HTTP helpers ────────────────────────────────────────────────

function fetchText(url: string, timeoutMs: number, redirects = 3): Promise<string | null> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      { timeout: timeoutMs, headers: { 'User-Agent': 'OctoNote/1.0 (+https://octonoteserver-production.up.railway.app)' } },
      (res) => {
        // Follow redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirects > 0
        ) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          resolve(fetchText(next, timeoutMs, redirects - 1));
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          resolve(null);
          return;
        }
        let data = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk: string) => {
          data += chunk;
          // We only need the <head> for OG tags — cap at 256KB.
          if (data.length > 262_144) {
            res.destroy();
          }
        });
        res.on('end', () => resolve(data));
        res.on('close', () => resolve(data || null));
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'OctoNote/1.0',
            Accept: 'application/vnd.github+json',
          },
          timeout: 5000,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            res.resume();
            resolve(null);
            return;
          }
          let data = '';
          res.setEncoding('utf-8');
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          });
        },
      )
      .on('error', () => resolve(null));
  });
}
