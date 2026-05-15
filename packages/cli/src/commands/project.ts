import type { Command } from 'commander';
import type { Container, Note } from '@octonote/core';
import chalk from 'chalk';
import { outputJson, isJsonOutput } from '../utils/output.js';

export function registerProjectCommand(program: Command, container: Container): void {
  const project = program
    .command('project')
    .description('Manage projects — top-level groups for notes, meetings, diagrams & plans');

  // ── octonote project create ──────────────────────────
  project
    .command('create <name>')
    .description('Create a new project')
    .option('-d, --description <text>', 'Project description')
    .option('-r, --repo <slug>', 'Linked git repo slug (e.g. owner/repo)')
    .action(async (name: string, opts: { description?: string; repo?: string }) => {
      const created = await container.noteRepository.createProject(name, {
        description: opts.description ?? null,
        repo: opts.repo ?? null,
      });
      console.log(
        `${chalk.green('Created project')} ${chalk.bold(created.name)} ${chalk.dim(`(${created.slug})`)}`
      );
    });

  // ── octonote project list ────────────────────────────
  project
    .command('list')
    .description('List all projects')
    .option('-o, --output <format>', 'Output format (json)')
    .action(async (opts: { output?: string }) => {
      const projects = await container.noteRepository.listProjects();

      if (isJsonOutput(opts)) {
        outputJson(projects);
        return;
      }

      if (projects.length === 0) {
        console.log(chalk.dim('No projects yet. Create one with: octonote project create <name>'));
        return;
      }

      for (const p of projects) {
        const repo = p.repo ? chalk.dim(` ${p.repo}`) : '';
        console.log(`  ${chalk.bold(p.name)} ${chalk.cyan(p.slug)}${repo}`);
      }
      console.log(chalk.dim(`\n${projects.length} project(s)`));
    });

  // ── octonote project show ────────────────────────────
  project
    .command('show <slug>')
    .description('Show a project and its notes grouped by type')
    .option('-o, --output <format>', 'Output format (json)')
    .action(async (slug: string, opts: { output?: string }) => {
      const proj = await container.noteRepository.getProjectBySlug(slug);
      if (!proj) {
        console.error(`Project not found: "${slug}"`);
        process.exit(1);
      }

      const notes = await container.noteRepository.listNotes({ projectId: proj.id });

      if (isJsonOutput(opts)) {
        outputJson({ project: proj, notes });
        return;
      }

      console.log(chalk.bold.underline(proj.name) + chalk.dim(`  (${proj.slug})`));
      if (proj.description) console.log(proj.description);
      if (proj.repo) console.log(chalk.dim(`repo: ${proj.repo}`));
      console.log();

      if (notes.length === 0) {
        console.log(chalk.dim('No notes in this project yet.'));
        return;
      }

      const byType = new Map<string, Note[]>();
      for (const note of notes) {
        const list = byType.get(note.type) ?? [];
        list.push(note);
        byType.set(note.type, list);
      }

      for (const [type, list] of [...byType.entries()].sort()) {
        console.log(chalk.bold(`${type} (${list.length})`));
        for (const note of list) {
          console.log(`  ${note.title} ${chalk.dim(note.updatedAt.slice(0, 10))} ${chalk.dim(note.id)}`);
        }
        console.log();
      }
    });
}
