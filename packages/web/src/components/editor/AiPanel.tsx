import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import mermaid from 'mermaid';
import { useNoteStore } from '@/store/noteStore';
import { api } from '@/api/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Send,
  Loader2,
  StopCircle,
  FileText,
  GitBranch,
  Maximize2,
  Tag,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AiPanelProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse [[Note Title]] wikilinks in text and render as clickable spans */
function renderWithWikilinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const title = match[1];
    parts.push(
      <span
        key={`wl-${match.index}`}
        className="text-purple-400 hover:text-purple-300 cursor-pointer underline underline-offset-2"
        title={`Open note: ${title}`}
      >
        [[{title}]]
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Extract unique [[Note Title]] references from text */
function extractSources(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const sources = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    sources.add(match[1]);
  }
  return Array.from(sources);
}

// ---------------------------------------------------------------------------
// Inline Mermaid Preview
// ---------------------------------------------------------------------------

let mermaidCounter = 0;

function MermaidPreview({ source }: { source: string }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const id = `ai-mermaid-${++mermaidCounter}`;
        const { svg: rendered } = await mermaid.render(id, source);
        setSvg(rendered);
      } catch {
        setSvg('');
      }
    })();
  }, [source]);

  if (!svg) return null;

  return (
    <div
      className="my-2 rounded border border-border p-2 bg-background [&>svg]:max-w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiPanel({ noteId, open, onOpenChange }: AiPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchNote = useNoteStore((s) => s.fetchNote);

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;

    setResponse('');
    setStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await api.ai.stream(
        trimmed,
        (chunk: unknown) => {
          if (typeof chunk === 'string') {
            setResponse((prev) => prev + chunk);
          } else if (
            chunk &&
            typeof chunk === 'object' &&
            'text' in chunk &&
            typeof (chunk as { text: unknown }).text === 'string'
          ) {
            setResponse((prev) => prev + (chunk as { text: string }).text);
          } else if (
            chunk &&
            typeof chunk === 'object' &&
            'content' in chunk &&
            typeof (chunk as { content: unknown }).content === 'string'
          ) {
            setResponse((prev) => prev + (chunk as { content: string }).content);
          }
        },
        { signal: controller.signal },
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setResponse(
          (prev) =>
            prev + '\n\n[Error: ' + ((err as Error).message || 'Unknown error') + ']',
        );
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
      fetchNote(noteId);
    }
  }, [prompt, streaming, noteId, fetchNote]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = useCallback(
    (template: string) => {
      setPrompt(template);
    },
    [],
  );

  // Extract sources from response
  const sources = useMemo(() => extractSources(response), [response]);

  // Detect mermaid code blocks in response
  const mermaidBlocks = useMemo(() => {
    const regex = /```mermaid\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = regex.exec(response)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  }, [response]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[400px] flex-col sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assistant
          </SheetTitle>
          <SheetDescription>
            Ask AI to help create, edit, summarize, or diagram your notes.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-7"
            onClick={() => handleQuickAction(`Summarize the current note (noteId: ${noteId})`)}
          >
            <FileText className="h-3 w-3" />
            Summarize
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-7"
            onClick={() => handleQuickAction(`Generate a diagram for the current note (noteId: ${noteId})`)}
          >
            <GitBranch className="h-3 w-3" />
            Diagram
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-7"
            onClick={() => handleQuickAction(`Expand the current note with more detail (noteId: ${noteId})`)}
          >
            <Maximize2 className="h-3 w-3" />
            Expand
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-7"
            onClick={() => handleQuickAction(`Analyze and auto-tag the current note (noteId: ${noteId})`)}
          >
            <Tag className="h-3 w-3" />
            Auto-tag
          </Button>
        </div>

        {/* Prompt input */}
        <div className="space-y-3 pt-2">
          <Textarea
            placeholder="Ask AI to edit this note..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className="resize-none"
            disabled={streaming}
          />
          <div className="flex items-center gap-2">
            {streaming ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStop}
                className="gap-1.5"
              >
                <StopCircle className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                Run
              </Button>
            )}
            {streaming && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Streaming...
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Response display */}
        <ScrollArea className="flex-1 pt-2">
          {response ? (
            <div className="space-y-3">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {renderWithWikilinks(response)}
              </div>

              {/* Inline Mermaid previews */}
              {mermaidBlocks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Diagram Preview</p>
                  {mermaidBlocks.map((src, i) => (
                    <MermaidPreview key={i} source={src} />
                  ))}
                </div>
              )}

              {/* Sources section */}
              {sources.length > 0 && (
                <div className="border-t border-border pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sources</p>
                  <ul className="space-y-0.5">
                    {sources.map((title) => (
                      <li key={title} className="text-xs text-purple-400">
                        [[{title}]]
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              AI response will appear here.
            </p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
