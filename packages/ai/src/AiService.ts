import Anthropic from '@anthropic-ai/sdk';
import type { Container } from '@octonote/core';
import type { AiOptions, AiResult, ToolCallRecord, StreamCallback } from './types';
import { buildSystemPrompt } from './context';
import { TOOL_DEFINITIONS } from './tools/definitions';
import { executeTool } from './tools/executor';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_ROUNDS = 10;

export class AiService {
  private client: Anthropic;
  private container: Container;
  private messages: Anthropic.Messages.MessageParam[] = [];

  constructor(container: Container, apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.container = container;
  }

  /**
   * Run a prompt through Claude with tool use.
   * Loops until Claude produces a text response or max rounds.
   */
  async run(prompt: string, options: AiOptions = {}): Promise<AiResult> {
    const model = options.model || DEFAULT_MODEL;
    const maxRounds = options.maxRounds || DEFAULT_MAX_ROUNDS;
    const shouldStream = options.stream !== false;
    const onStream = options.onStream;

    const systemPrompt = await buildSystemPrompt(this.container);
    const toolCalls: ToolCallRecord[] = [];
    const affectedNotes = new Set<string>();
    const sources = new Set<string>();

    // Add user message
    this.messages.push({ role: 'user', content: prompt });

    let finalResponse = '';

    for (let round = 0; round < maxRounds; round++) {
      let response: Anthropic.Messages.Message;

      if (shouldStream && onStream) {
        response = await this.runStreaming(systemPrompt, model, onStream);
      } else {
        response = await this.client.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          tools: TOOL_DEFINITIONS,
          messages: this.messages,
        });
      }

      // Collect text blocks
      const textParts: string[] = [];
      for (const block of response.content) {
        if (block.type === 'text') {
          textParts.push(block.text);
        }
      }

      // If stop reason is end_turn or no tool use, we're done
      if (response.stop_reason === 'end_turn') {
        finalResponse = textParts.join('\n');
        this.messages.push({ role: 'assistant', content: response.content });
        break;
      }

      // Process tool use blocks
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        // No tool calls and no end_turn — take text as final response
        finalResponse = textParts.join('\n');
        this.messages.push({ role: 'assistant', content: response.content });
        break;
      }

      // Add assistant message with tool use
      this.messages.push({ role: 'assistant', content: response.content });

      // Execute each tool and collect results
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(
          this.container,
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        toolCalls.push({
          toolName: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          result,
        });

        // Track affected notes
        if (result.success && result.data) {
          const data = result.data as Record<string, unknown>;
          if (data.noteId) {
            affectedNotes.add(data.noteId as string);
          }
        }

        // Track source notes for read operations
        if (toolUse.name === 'get_note' && result.success && result.data) {
          const data = result.data as Record<string, unknown>;
          if (data.title) sources.add(data.title as string);
        }
        if (toolUse.name === 'get_notes_content' && result.success && Array.isArray(result.data)) {
          for (const note of result.data as Array<Record<string, unknown>>) {
            if (note.title) sources.add(note.title as string);
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Feed results back
      this.messages.push({ role: 'user', content: toolResults });
    }

    return {
      response: finalResponse,
      toolCalls,
      affectedNotes: Array.from(affectedNotes),
      sources: Array.from(sources),
    };
  }

  /**
   * Reset conversation history for a new session.
   */
  resetConversation(): void {
    this.messages = [];
  }

  private async runStreaming(
    systemPrompt: string,
    model: string,
    onStream: StreamCallback
  ): Promise<Anthropic.Messages.Message> {
    const stream = this.client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages: this.messages,
    });

    stream.on('text', (text) => {
      onStream(text);
    });

    const message = await stream.finalMessage();
    return message;
  }
}
