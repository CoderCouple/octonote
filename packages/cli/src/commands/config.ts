import type { Command } from 'commander';
import type { Container, VaultConfig, StorageFormat } from '@octonote/core';
import chalk from 'chalk';

export function registerConfigCommand(program: Command, container: Container): void {
  program
    .command('config')
    .description('View or update vault configuration')
    .option('--api-key <key>', 'Set Anthropic API key')
    .option('--vault <path>', 'Set vault path')
    .option('--theme <theme>', 'Set theme')
    .option('--fmt <format>', 'Set default storage format (json|markdown)')
    .option('-l, --list', 'List all config values')
    .action((opts: { apiKey?: string; vault?: string; theme?: string; fmt?: string; list?: boolean }) => {
      const { vaultManager } = container;

      // If any setter passed, update config
      const updates: Partial<VaultConfig> = {};
      if (opts.apiKey) updates.anthropicApiKey = opts.apiKey;
      if (opts.vault) updates.vaultPath = opts.vault;
      if (opts.theme) updates.theme = opts.theme;
      if (opts.fmt) {
        if (opts.fmt !== 'json' && opts.fmt !== 'markdown') {
          console.error('Format must be "json" or "markdown"');
          process.exit(1);
        }
        updates.storageFmt = opts.fmt as StorageFormat;
      }

      if (Object.keys(updates).length > 0) {
        const config = vaultManager.setConfig(updates);
        console.log(chalk.green('Config updated.'));
        printConfig(config);
        return;
      }

      // Default: list config
      const config = vaultManager.getConfig();
      printConfig(config);
    });
}

function printConfig(config: VaultConfig): void {
  for (const [key, value] of Object.entries(config)) {
    const display = key === 'anthropicApiKey' && typeof value === 'string' && value.length > 8
      ? value.slice(0, 8) + '...'
      : String(value ?? '');
    console.log(`  ${chalk.bold(key)}: ${display}`);
  }
}
