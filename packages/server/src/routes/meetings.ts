import { Router, type Request, type Response, type NextFunction } from 'express';
import express from 'express';
import type { Container } from '@octonote/core';
import type { Broadcaster } from '../ws/broadcaster';
import { resolveApiKey } from '@octonote/ai';
import Anthropic from '@anthropic-ai/sdk';

const SUMMARY_SYSTEM_PROMPT = `You are an expert meeting-notes writer. Given a raw transcript (possibly with speaker labels like "Speaker 1:", "Speaker 2:"), produce a well-organized markdown summary.

Rules:
- Open with a brief "### Background & Current Status" section (3-6 bullets) only if there is enough context. Skip otherwise.
- Group the rest into thematic "### Section Title" sections, one per major topic discussed, with bullets (and sub-bullets where useful).
- Capture concrete numbers, names, decisions, and quotes verbatim.
- When speaker labels are present, attribute important statements to the speaker.
- End with an "### Action Items" section using markdown task list syntax: \`- [ ] item\`. Include the owner in square brackets when clear. Only include this section if there are real action items.
- Be concise — no filler, no restating obvious things, no "summary" line at the top.
- Do not include the raw transcript in your output.

Return only the markdown body, no preamble.`;

export function meetingsRouter(container: Container, broadcaster: Broadcaster): Router {
  const router = Router();

  // Audio uploads are accepted as a raw body (Content-Type: audio/*). ~25 MB
  // matches Whisper's per-file limit and is well within ElevenLabs' headroom.
  router.post(
    '/transcribe',
    express.raw({ type: 'audio/*', limit: '25mb' }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!process.env.ELEVEN_API_KEY && !process.env.OPENAI_API_KEY) {
          res.status(500).json({
            error: 'no transcription provider configured — set ELEVEN_API_KEY or OPENAI_API_KEY',
          });
          return;
        }

        const audio = req.body as Buffer | undefined;
        if (!audio || !Buffer.isBuffer(audio) || audio.length === 0) {
          res.status(400).json({ error: 'audio body is required (Content-Type: audio/*)' });
          return;
        }

        // Strip parameters like `;codecs=opus` — Whisper / ElevenLabs match
        // on the bare MIME and the codec hint can confuse the file detector.
        const contentType = (req.headers['content-type'] || 'audio/webm').toString().split(';')[0].trim();
        const ext = audioExt(contentType);
        console.log(`[meetings] received audio: ${audio.length} bytes, type=${contentType}, ext=${ext}`);
        const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
        const titleOverride = typeof req.query.title === 'string' ? req.query.title : undefined;

        // 1. Transcribe — ElevenLabs first (diarization), Whisper fallback.
        const transcript = await transcribe(audio, contentType, ext);
        if (!transcript) {
          res.status(502).json({ error: 'transcription failed (both providers)' });
          return;
        }

        // 2. Summarise via Claude.
        const summaryMarkdown = await summariseWithClaude(transcript, container);

        // 3. Create the meeting note.
        const now = new Date();
        const title = titleOverride ?? `Meeting — ${now.toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })}`;

        const note = await container.noteRepository.createNote(title, {
          projectId: projectId ?? null,
          type: 'meeting',
          transcript,
        });

        const { blocks } = container.blockEngine.parseMarkdown(summaryMarkdown, note.id);
        for (const block of blocks) {
          await container.noteRepository.createBlock({
            noteId: note.id,
            type: block.type,
            content: block.content,
            meta: block.meta,
            position: block.position,
            parentId: block.parentId,
          });
        }

        broadcaster.broadcast('note:created', { noteId: note.id, title: note.title });

        const full = await container.noteRepository.getNote(note.id);
        res.status(201).json(full);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

// ── Transcription chain ────────────────────────────────────────

async function transcribe(audio: Buffer, contentType: string, ext: string): Promise<string | null> {
  if (process.env.ELEVEN_API_KEY) {
    const result = await transcribeWithElevenLabs(audio, contentType, ext, process.env.ELEVEN_API_KEY);
    if (result) return result;
    console.warn('ElevenLabs transcription failed — falling back to Whisper if configured.');
  }
  if (process.env.OPENAI_API_KEY) {
    return transcribeWithWhisper(audio, contentType, ext, process.env.OPENAI_API_KEY);
  }
  return null;
}

async function transcribeWithElevenLabs(
  audio: Buffer,
  contentType: string,
  ext: string,
  apiKey: string,
): Promise<string | null> {
  const form = new FormData();
  form.append('file', new Blob([bufferToArrayBuffer(audio)], { type: contentType }), `audio.${ext}`);
  form.append('model_id', 'scribe_v1');
  form.append('diarize', 'true');
  form.append('tag_audio_events', 'false');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });
  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error(`ElevenLabs STT error ${response.status}: ${errBody}`);
    return null;
  }
  const data = (await response.json()) as ElevenLabsResponse;
  return formatWithSpeakers(data);
}

async function transcribeWithWhisper(
  audio: Buffer,
  contentType: string,
  ext: string,
  apiKey: string,
): Promise<string | null> {
  const form = new FormData();
  form.append('file', new Blob([bufferToArrayBuffer(audio)], { type: contentType }), `audio.${ext}`);
  form.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error(`Whisper API error ${response.status}: ${errBody}`);
    return null;
  }
  const data = (await response.json()) as { text?: string };
  return typeof data.text === 'string' ? data.text.trim() : null;
}

// ── ElevenLabs response handling ───────────────────────────────

interface ElevenLabsWord {
  text: string;
  type?: 'word' | 'spacing' | 'audio_event';
  speaker_id?: string;
  start?: number;
  end?: number;
}
interface ElevenLabsResponse {
  text?: string;
  language_code?: string;
  words?: ElevenLabsWord[];
}

/** Walk the word stream and emit speaker-labelled turns. */
function formatWithSpeakers(data: ElevenLabsResponse): string {
  const words = data.words;
  if (!words || words.length === 0) {
    return typeof data.text === 'string' ? data.text.trim() : '';
  }

  const turns: { speaker: string; text: string }[] = [];
  let current: { speaker: string; text: string } | null = null;

  for (const w of words) {
    if (w.type === 'audio_event') continue;
    const speaker = w.speaker_id ?? 'speaker_0';
    const piece = w.text ?? '';
    if (!current || current.speaker !== speaker) {
      if (current) turns.push(current);
      current = { speaker, text: piece };
    } else {
      current.text += piece;
    }
  }
  if (current) turns.push(current);

  return turns
    .map((t) => `${labelSpeaker(t.speaker)}: ${t.text.trim()}`)
    .filter((line) => line.endsWith(':') === false)
    .join('\n\n');
}

function labelSpeaker(id: string): string {
  const m = id.match(/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    // ElevenLabs uses 0-based speaker IDs; humans like 1-based.
    return `Speaker ${id.startsWith('speaker_0') ? n + 1 : n}`;
  }
  return id;
}

// ── Claude summarisation ───────────────────────────────────────

async function summariseWithClaude(transcript: string, container: Container): Promise<string> {
  const apiKey = resolveApiKey(container);
  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Transcript:\n\n"""\n${transcript}\n"""\n\nWrite the meeting summary now.`,
      },
    ],
  });

  const block = msg.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

// ── helpers ────────────────────────────────────────────────────

/** Copy a Node Buffer into a fresh ArrayBuffer with exactly its bytes —
 *  Node Buffers are views into a pooled allocator, so passing them straight
 *  into Blob() can include garbage past the intended range. */
function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function audioExt(contentType: string): string {
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('mpeg')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  return 'webm';
}
