import { useState, useCallback, useRef } from 'react';
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
import { Sparkles, Send, Loader2, StopCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AiPanelProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          // Accumulate streaming text chunks
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
      // Refresh the note to pick up any AI-generated changes
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[400px] flex-col sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assistant
          </SheetTitle>
          <SheetDescription>
            Ask AI to help create, edit, or summarize your note.
          </SheetDescription>
        </SheetHeader>

        <Separator />

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
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {response}
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
