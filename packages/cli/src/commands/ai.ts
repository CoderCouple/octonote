import type { Command } from 'commander';
import type { Container } from '@octonote/core';
import chalk from 'chalk';
import * as readline from 'readline';
import { AiService, resolveApiKey } from '@octonote/ai';
import { isJsonOutput, outputJson } from '../utils/output.js';

export function registerAiCommand(program: Command, container: Container): void {
  program
    .command('ai [prompt...]')
    .description('AI-powered note creation and editing')
    .option('--chat', 'Interactive multi-turn chat mode')
    .option('--output <format>', 'Output format (json)')
    .option('--no-stream', 'Disable streaming output')
    .option('--model <model>', 'Claude model to use')
    .action(async (promptWords: string[], opts: Record<string, unknown>) => {
      let apiKey: string;
      try {
        apiKey = resolveApiKey(container);
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exit(1);
      }

      const service = new AiService(container, apiKey);
      const jsonMode = isJsonOutput(opts as { output?: string });
      const shouldStream = opts.stream !== false && !jsonMode;

      const streamCallback = shouldStream
        ? (text: string) => process.stdout.write(text)
        : undefined;

      if (opts.chat) {
        // Interactive chat mode
        const prompt = promptWords.length > 0 ? promptWords.join(' ') : null;

        if (prompt) {
          await runPrompt(service, prompt, { stream: shouldStream, onStream: streamCallback, model: opts.model as string | undefined }, jsonMode);
        }

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const askQuestion = (): void => {
          rl.question(chalk.cyan('\nocto-ai> '), async (input: string) => {
            const trimmed = input.trim();
            if (!trimmed || trimmed === 'exit' || trimmed === 'quit') {
              rl.close();
              return;
            }

            await runPrompt(service, trimmed, { stream: shouldStream, onStream: streamCallback, model: opts.model as string | undefined }, jsonMode);
            askQuestion();
          });
        };

        if (!prompt) {
          console.log(chalk.dim('OctoNote AI — type your prompt, "exit" to quit'));
        }
        askQuestion();
      } else {
        // Single-shot mode
        const prompt = promptWords.join(' ');
        if (!prompt) {
          console.error(chalk.red('Please provide a prompt. Usage: octo ai "your prompt"'));
          process.exit(1);
        }

        await runPrompt(service, prompt, { stream: shouldStream, onStream: streamCallback, model: opts.model as string | undefined }, jsonMode);
      }
    });
}

async function runPrompt(
  service: AiService,
  prompt: string,
  options: { stream?: boolean; onStream?: (text: string) => void; model?: string },
  jsonMode: boolean,
): Promise<void> {
  try {
    const result = await service.run(prompt, {
      stream: options.stream,
      onStream: options.onStream,
      model: options.model,
    });

    if (jsonMode) {
      outputJson(result);
    } else {
      // If we streamed, text was already printed; add a newline
      if (options.stream && options.onStream) {
        console.log();
      } else {
        console.log(result.response);
      }

      // Show tool call summary
      if (result.toolCalls.length > 0) {
        console.log(chalk.dim(`\n  ${result.toolCalls.length} tool call(s): ${result.toolCalls.map(t => t.toolName).join(', ')}`));
      }
    }
  } catch (err: any) {
    console.error(chalk.red(`AI error: ${err.message}`));
  }
}
