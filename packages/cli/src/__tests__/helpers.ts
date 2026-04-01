import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
  createContainer,
  type Container,
} from '@octonote/core';

/**
 * Create a temporary vault with an in-memory-like setup for testing.
 */
export function createTestContainer(): Container {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-test-'));
  return createContainer(tmpDir);
}

/**
 * Capture console.log output during a function call.
 */
export async function captureOutput(fn: () => void | Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return lines;
}

/**
 * Capture console.error output during a function call.
 */
export async function captureError(fn: () => void | Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    await fn();
  } finally {
    console.error = original;
  }
  return lines;
}
