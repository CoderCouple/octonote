import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import { outputJson, isJsonOutput } from '../utils/output.js';

export function registerTodayCommand(program: Command, container: Container): void {
  program
    .command('today')
    .description("View today's daily note")
    .option('-o, --output <format>', 'Output format (json)')
    .action((opts: { output?: string }) => {
      const note = container.dailyNoteService.getOrCreateToday();
      const streak = container.dailyNoteService.getStreak();

      if (isJsonOutput(opts)) {
        outputJson({ note, streak });
        return;
      }

      console.log(chalk.bold.underline(note.title));
      if (streak > 1) {
        console.log(chalk.yellow(`Streak: ${streak} days`));
      }
      console.log();

      if (note.blocks?.length) {
        const rendered = container.blockEngine.renderForTerminal(note.blocks);
        console.log(rendered);
      } else {
        console.log(chalk.dim('Empty daily note. Use `octo edit` to add content.'));
      }
    });
}
