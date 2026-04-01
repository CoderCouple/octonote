import type { Container } from '@octonote/core';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  result: ToolResult;
}

export type StreamCallback = (text: string) => void;

export interface AiOptions {
  model?: string;
  stream?: boolean;
  onStream?: StreamCallback;
  maxRounds?: number;
}

export interface AiResult {
  response: string;
  toolCalls: ToolCallRecord[];
  affectedNotes: string[];
}

export interface AiServiceConfig {
  container: Container;
  apiKey: string;
}
