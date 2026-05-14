import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import {
  createContainer,
  type Container,
} from '@octonote/core';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

/**
 * Create a temporary vault with a test PostgreSQL database for testing.
 */
export async function createTestContainer(): Promise<Container> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-test-'));
  const container = await createContainer(TEST_DATABASE_URL, tmpDir);
  // Clean tables
  await container.pool.query('DELETE FROM daily_notes');
  await container.pool.query('DELETE FROM links');
  await container.pool.query('DELETE FROM note_tags');
  await container.pool.query('DELETE FROM blocks');
  await container.pool.query('DELETE FROM notes');
  await container.pool.query('DELETE FROM tags');
  await container.pool.query('DELETE FROM folders');
  return container;
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
