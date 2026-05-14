import type { Command } from 'commander';
import type { VaultManager, VaultConfig, StorageFormat } from '@octonote/core';
import chalk from 'chalk';

export function registerConfigCommand(program: Command, vaultManager: VaultManager): void {
  program
    .command('config')
    .description('View or update vault configuration')
    .option('--api-key <key>', 'Set Anthropic API key')
    .option('--db <url>', 'Set PostgreSQL connection string')
    .option('--vault <path>', 'Set vault path')
    .option('--theme <theme>', 'Set theme')
    .option('--fmt <format>', 'Set default storage format (json|markdown)')
    .option('-l, --list', 'List all config values')
    .action((opts: { apiKey?: string; db?: string; vault?: string; theme?: string; fmt?: string; list?: boolean }) => {
      // If any setter passed, update config
      const updates: Partial<VaultConfig> = {};
      if (opts.apiKey) updates.anthropicApiKey = opts.apiKey;
      if (opts.db) updates.databaseUrl = opts.db;
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
    const masked = key === 'anthropicApiKey' || key === 'databaseUrl';
    const display = masked && typeof value === 'string' && value.length > 8
      ? value.slice(0, 8) + '...'
      : String(value ?? '');
    console.log(`  ${chalk.bold(key)}: ${display}`);
  }
}
