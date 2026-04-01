/**
 * Print data as JSON to stdout.
 */
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Check if --output json was passed.
 */
export function isJsonOutput(opts: { output?: string }): boolean {
  return opts.output === 'json';
}
