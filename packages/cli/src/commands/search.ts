import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import { outputJson, isJsonOutput } from '../utils/output.js';

export function registerSearchCommand(program: Command, container: Container): void {
  program
    .command('search <query>')
    .description('Search notes')
    .option('-t, --tag <tag>', 'Filter results by tag')
    .option('-l, --limit <n>', 'Max results', '20')
    .option('-o, --output <format>', 'Output format (json)')
    .action(async (query: string, opts: { tag?: string; limit: string; output?: string }) => {
      // Lazy index rebuild: load all notes into search index
      const allNotes = await container.noteRepository.listNotes();
      container.searchEngine.rebuildIndex(allNotes);

      let results = container.searchEngine.search(query, {
        limit: parseInt(opts.limit, 10),
      });

      // Filter by tag if specified
      if (opts.tag) {
        results = results.filter(r =>
          r.tags.some(t => t.toLowerCase() === opts.tag!.toLowerCase())
        );
      }

      if (isJsonOutput(opts)) {
        outputJson(results);
        return;
      }

      if (results.length === 0) {
        console.log(chalk.dim('No results found.'));
        return;
      }

      for (const r of results) {
        const score = chalk.dim(`(${r.score.toFixed(1)})`);
        const tags = r.tags.length ? ' ' + r.tags.map(t => chalk.cyan(`#${t}`)).join(' ') : '';
        console.log(`  ${chalk.bold(r.title)} ${score}${tags}`);
      }
      console.log(chalk.dim(`\n${results.length} result(s)`));
    });
}
