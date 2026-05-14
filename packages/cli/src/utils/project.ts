import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Derive a stable project slug for a directory. Prefers the git `origin`
 * remote normalized to `owner/repo`; falls back to the directory name.
 */
export function getProjectSlug(cwd: string = process.cwd()): string {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const slug = normalizeRemote(remote);
    if (slug) return slug;
  } catch {
    // not a git repo, or no origin remote — fall through
  }
  return path.basename(path.resolve(cwd));
}

/** Extract `owner/repo` from an SSH or HTTPS git remote URL. */
function normalizeRemote(remote: string): string | null {
  // git@github.com:owner/repo.git  |  https://github.com/owner/repo(.git)
  const match = remote.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?\/?$/);
  return match ? match[1] : null;
}
