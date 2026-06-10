import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useNoteStore } from '@/store/noteStore';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { MeetingView } from '@/components/meeting/MeetingView';

// Lazy-load tldraw — it's ~1MB and only used by diagram-type notes.
const DrawingView = lazy(() =>
  import('@/components/drawing/DrawingView').then((m) => ({ default: m.DrawingView })),
);
import { AiPanel } from '@/components/editor/AiPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Sparkles, ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentNote = useNoteStore((s) => s.currentNote);
  const loading = useNoteStore((s) => s.loading);
  const dirty = useNoteStore((s) => s.dirty);
  const fetchNote = useNoteStore((s) => s.fetchNote);
  const patchCurrentNote = useNoteStore((s) => s.patchCurrentNote);
  const setDirty = useNoteStore((s) => s.setDirty);
  const initWebSocket = useNoteStore((s) => s.initWebSocket);

  const [aiOpen, setAiOpen] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsInitRef = useRef(false);

  // Fetch note on mount / id change
  useEffect(() => {
    if (id) {
      fetchNote(id);
    }
  }, [id, fetchNote]);

  // Initialize WebSocket once
  useEffect(() => {
    if (!wsInitRef.current) {
      initWebSocket();
      wsInitRef.current = true;
    }
  }, [initWebSocket]);

  // Auto-save title with debounce. We hit the API directly instead of the
  // store action — the store would overwrite currentNote with the server
  // response and clobber any keystrokes that landed during the request.
  useEffect(() => {
    if (!dirty || !currentNote) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    const id = currentNote.id;
    const title = currentNote.title;
    saveTimerRef.current = setTimeout(() => {
      api.notes
        .update(id, { title })
        .then(() => setDirty(false))
        .catch((err) => console.error('Failed to save title:', err));
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [dirty, currentNote, setDirty]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!currentNote) return;
      // Optimistic local update only — debounced effect persists to the API.
      patchCurrentNote({ title: e.target.value });
      setDirty(true);
    },
    [currentNote, patchCurrentNote, setDirty],
  );

  // -----------------------------------------------------------------------
  // Loading / not found states
  // -----------------------------------------------------------------------

  if (loading && !currentNote) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="mb-4 h-8 w-1/2" />
        <Skeleton className="mb-2 h-5 w-full" />
        <Skeleton className="mb-2 h-5 w-full" />
        <Skeleton className="mb-2 h-5 w-3/4" />
      </div>
    );
  }

  if (!currentNote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">Note not found</p>
        <Button variant="link" onClick={() => navigate('/')}>
          Back to notes
        </Button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="relative flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to notes</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input
          value={currentNote.title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent text-lg font-semibold outline-none"
          placeholder="Untitled"
        />

        {dirty && (
          <span className="text-xs text-muted-foreground">Unsaved</span>
        )}

        {currentNote.tags && currentNote.tags.length > 0 && (
          <div className="hidden items-center gap-1 sm:flex">
            {currentNote.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Editor area */}
      {currentNote.type === 'diagram' ? (
        // Drawings fill the remaining pane — no scroll wrapper, no backlinks.
        // tldraw handles its own pan/zoom and should not be nested in a
        // scroll container.
        <div className="flex-1 min-h-0">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <DrawingView key={currentNote.id} note={currentNote} />
          </Suspense>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {currentNote.type === 'meeting' ? (
              <MeetingView note={currentNote} />
            ) : (
              <BlockEditor
                key={currentNote.id}
                blocks={currentNote.blocks ?? []}
                noteId={currentNote.id}
              />
            )}
          </div>
        </ScrollArea>
      )}

      {/* Floating AI button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
              onClick={() => setAiOpen(true)}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">AI Assistant</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* AI panel */}
      <AiPanel noteId={currentNote.id} open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}
