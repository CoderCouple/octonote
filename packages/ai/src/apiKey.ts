import type { Container } from '@octonote/core';

/**
 * Resolve the Anthropic API key.
 * Priority: env ANTHROPIC_API_KEY → config.json → error.
 */
export function resolveApiKey(container: Container): string {
  // 1. Environment variable
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return envKey;

  // 2. Vault config
  const config = container.vaultManager.getConfig();
  if (config.anthropicApiKey) return config.anthropicApiKey;

  // 3. Error
  throw new Error(
    'Anthropic API key not found. Set ANTHROPIC_API_KEY env var or run: octo config --api-key <key>'
  );
}
