import type { Command } from 'commander';
import type { Container, Folder } from '@octonote/core';
import chalk from 'chalk';
import { getProjectSlug } from '../utils/project.js';
import { resolveNote } from '../utils/resolveNote.js';
import { outputJson, isJsonOutput } from '../utils/output.js';

const BRAIN_ROOT = 'Brain';

/** Ensure the `Brain/<project>` folder exists and return it. */
async function ensureProjectFolder(container: Container, projectSlug: string): Promise<Folder> {
  const root = await container.noteRepository.ensureFolder(BRAIN_ROOT, null);
  return container.noteRepository.ensureFolder(projectSlug, root.id);
}

/** Look up the `Brain/<project>` folder without creating it. */
async function findProjectFolder(container: Container, projectSlug: string): Promise<Folder | undefined> {
  const root = await container.noteRepository.getFolderByName(BRAIN_ROOT, null);
  if (!root) return undefined;
  return container.noteRepository.getFolderByName(projectSlug, root.id);
}

/** Slugify the plan's first heading/line into a short description (max ~5 words). */
function deriveShortDesc(planText: string): string {
  for (const line of planText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const slug = trimmed
      .replace(/^#+\s*/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .filter(Boolean)
      .slice(0, 5)
      .join('-');
    return slug || 'plan';
  }
  return 'plan';
}

/** Build a plan title: `<repo>-<short-desc>-<datetime>`. */
function derivePlanTitle(planText: string, projectSlug: string): string {
  const repo = projectSlug.split('/').pop() || projectSlug;
  const datetime = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${repo}-${deriveShortDesc(planText)}-${datetime}`;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

export function registerBrainCommand(program: Command, container: Container): void {
  const brain = program
    .command('brain')
    .description('Project & global memory for AI coding agents');

  // ── octonote brain save-plan ─────────────────────────
  brain
    .command('save-plan')
    .description('Save a plan into the project brain (reads plan markdown from stdin)')
    .option('-p, --project <slug>', 'Project slug (defaults to the git remote of the cwd)')
    .option('-t, --title <title>', 'Plan title')
    .option('--text <text>', 'Plan text (instead of reading stdin)')
    .action(async (opts: { project?: string; title?: string; text?: string }) => {
      const planText = opts.text ?? (await readStdin());
      if (!planText.trim()) {
        console.error('No plan text provided (stdin was empty).');
        process.exit(1);
      }

      const projectSlug = opts.project || getProjectSlug();
      const folder = await ensureProjectFolder(container, projectSlug);
      const title = opts.title || derivePlanTitle(planText, projectSlug);

      const note = await container.noteRepository.createNote(title, folder.id, 'json');
      const { blocks } = container.blockEngine.parseMarkdown(planText, note.id);
      for (const block of blocks) {
        await container.noteRepository.createBlock({
          noteId: note.id,
          type: block.type,
          content: block.content,
          meta: block.meta,
          position: block.position,
          parentId: block.parentId,
        });
      }
      await container.noteRepository.addTagToNote(note.id, 'type:plan');
      await container.noteRepository.addTagToNote(note.id, 'by:claude-code');

      console.log(
        `${chalk.green('Saved plan')} ${chalk.bold(title)} → ${chalk.cyan(`${BRAIN_ROOT}/${projectSlug}`)} ${chalk.dim(`(${note.id})`)}`
      );
    });

  // ── octonote brain list ──────────────────────────────
  brain
    .command('list')
    .description('List brain entries for a project')
    .option('-p, --project <slug>', 'Project slug (defaults to the git remote of the cwd)')
    .option('-o, --output <format>', 'Output format (json)')
    .action(async (opts: { project?: string; output?: string }) => {
      const projectSlug = opts.project || getProjectSlug();
      const folder = await findProjectFolder(container, projectSlug);
      const notes = folder
        ? await container.noteRepository.listNotes({ folderId: folder.id })
        : [];

      if (isJsonOutput(opts)) {
        outputJson({ project: projectSlug, entries: notes });
        return;
      }

      if (notes.length === 0) {
        console.log(chalk.dim(`No brain entries for ${projectSlug}.`));
        return;
      }

      console.log(chalk.bold(`${BRAIN_ROOT}/${projectSlug}`));
      for (const note of notes) {
        console.log(`  ${chalk.bold(note.title)} ${chalk.dim(note.updatedAt.slice(0, 10))} ${chalk.dim(note.id)}`);
      }
      console.log(chalk.dim(`\n${notes.length} entr${notes.length === 1 ? 'y' : 'ies'}`));
    });

  // ── octonote brain show ──────────────────────────────
  brain
    .command('show <titleOrId>')
    .description('Show a brain entry')
    .option('-o, --output <format>', 'Output format (json)')
    .action(async (titleOrId: string, opts: { output?: string }) => {
      const note = await resolveNote(container, titleOrId);

      if (isJsonOutput(opts)) {
        outputJson(note);
        return;
      }

      console.log(chalk.bold.underline(note.title));
      if (note.tags?.length) {
        console.log(chalk.dim('Tags: ') + note.tags.map((t) => chalk.cyan(`#${t.name}`)).join(' '));
      }
      console.log(chalk.dim(`Created: ${note.createdAt}  Updated: ${note.updatedAt}`));
      console.log();
      if (note.blocks?.length) {
        console.log(container.blockEngine.renderForTerminal(note.blocks));
      }
    });
}
