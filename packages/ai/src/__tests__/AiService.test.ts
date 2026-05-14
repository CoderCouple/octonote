import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContainer, type Container } from '@octonote/core';
import { AiService } from '../AiService';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const mockStream = vi.fn();

  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
        stream: mockStream,
      },
    })),
    __mockCreate: mockCreate,
    __mockStream: mockStream,
  };
});

// Get mock references
import { __mockCreate, __mockStream } from '@anthropic-ai/sdk';
const mockCreate = __mockCreate as any;
const mockStream = __mockStream as any;

describe('AiService', () => {
  let tmpDir: string;
  let container: Container;

  afterEach(async () => {
    if (container) await container.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  async function setup(): Promise<Container> {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octonote-ai-svc-'));
    container = await createContainer(TEST_DATABASE_URL, tmpDir);
    await container.pool.query('DELETE FROM daily_notes');
    await container.pool.query('DELETE FROM links');
    await container.pool.query('DELETE FROM note_tags');
    await container.pool.query('DELETE FROM blocks');
    await container.pool.query('DELETE FROM notes');
    await container.pool.query('DELETE FROM tags');
    await container.pool.query('DELETE FROM folders');
    return container;
  }

  it('returns text response from Claude', async () => {
    const c = await setup();
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Here is your answer.' }],
      stop_reason: 'end_turn',
    });

    const service = new AiService(c, 'sk-test');
    const result = await service.run('Hello', { stream: false });

    expect(result.response).toBe('Here is your answer.');
    expect(result.toolCalls).toEqual([]);
  });

  it('executes tool calls and loops back', async () => {
    const c = await setup();

    // First call: Claude wants to use a tool
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: 'text', text: 'Let me create that note.' },
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'create_note',
          input: {
            title: 'AI Created',
            blocks: [{ type: 'paragraph', content: 'Created by AI' }],
          },
        },
      ],
      stop_reason: 'tool_use',
    });

    // Second call: Claude returns final text
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I created the note "AI Created".' }],
      stop_reason: 'end_turn',
    });

    const service = new AiService(c, 'sk-test');
    const result = await service.run('Create a note', { stream: false });

    expect(result.response).toBe('I created the note "AI Created".');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].toolName).toBe('create_note');
    expect(result.toolCalls[0].result.success).toBe(true);
    expect(result.affectedNotes).toHaveLength(1);

    // Verify note was actually created in DB
    const note = await c.noteRepository.getNoteByTitle('AI Created');
    expect(note).toBeDefined();
    expect(note!.blocks).toHaveLength(1);
  });

  it('respects max rounds', async () => {
    const c = await setup();

    // Always return tool use — should hit max rounds
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_loop',
          name: 'list_tags',
          input: {},
        },
      ],
      stop_reason: 'tool_use',
    });

    const service = new AiService(c, 'sk-test');
    const result = await service.run('loop forever', { stream: false, maxRounds: 3 });

    // Should have called create exactly 3 times (max rounds)
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(result.toolCalls).toHaveLength(3);
  });

  it('handles streaming with callback', async () => {
    const c = await setup();
    const chunks: string[] = [];

    const mockStreamInstance = {
      on: vi.fn().mockImplementation(function (this: any, event: string, cb: (text: string) => void) {
        if (event === 'text') {
          // Simulate streaming text
          cb('Hello ');
          cb('world!');
        }
        return this;
      }),
      finalMessage: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello world!' }],
        stop_reason: 'end_turn',
      }),
    };

    mockStream.mockReturnValueOnce(mockStreamInstance);

    const service = new AiService(c, 'sk-test');
    const result = await service.run('Hi', {
      stream: true,
      onStream: (text) => chunks.push(text),
    });

    expect(result.response).toBe('Hello world!');
    expect(chunks).toEqual(['Hello ', 'world!']);
  });

  it('resets conversation history', async () => {
    const c = await setup();
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
      stop_reason: 'end_turn',
    });

    const service = new AiService(c, 'sk-test');
    await service.run('First', { stream: false });
    await service.run('Second', { stream: false });

    // After 2 runs, messages array should have 4 entries (2 user + 2 assistant)
    // After reset, it should be empty
    service.resetConversation();

    await service.run('Third', { stream: false });

    // After reset, the third call's messages should start with 'Third' (not accumulated from before)
    const lastCall = mockCreate.mock.calls[2];
    // messages is passed by reference and mutated after call, so it will have 2 entries
    // (user + assistant). But the first message should be 'Third', proving reset worked.
    expect(lastCall[0].messages[0].role).toBe('user');
    expect(lastCall[0].messages[0].content).toBe('Third');
    // Without reset, it would have 6 entries (First+resp, Second+resp, Third+resp)
    expect(lastCall[0].messages).toHaveLength(2);
  });
});
