import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useNoteStore } from '@/store/noteStore';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { MeetingView } from '@/components/meeting/MeetingView';
import { AiPanel } from '@/components/editor/AiPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  ArrowLeft,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Link } from '@/types';

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
  const updateNote = useNoteStore((s) => s.updateNote);
  const setDirty = useNoteStore((s) => s.setDirty);
  const initWebSocket = useNoteStore((s) => s.initWebSocket);

  const [aiOpen, setAiOpen] = useState(false);
  const [backlinksOpen, setBacklinksOpen] = useState(false);
  const [backlinks, setBacklinks] = useState<Link[]>([]);
  const [backlinkNotes, setBacklinkNotes] = useState<
    Map<string, { id: string; title: string }>
  >(new Map());

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

  // Fetch backlinks
  useEffect(() => {
    if (!id) return;
    api.links
      .get(id)
      .then(({ backlinks: bl }) => {
        setBacklinks(bl);
        // Fetch note titles for each backlink source
        const noteMap = new Map<string, { id: string; title: string }>();
        const promises = bl.map(async (link) => {
          try {
            const note = await api.notes.get(link.sourceNoteId);
            noteMap.set(link.sourceNoteId, { id: note.id, title: note.title });
          } catch {
            // Ignore missing notes
          }
        });
        Promise.all(promises).then(() => setBacklinkNotes(new Map(noteMap)));
      })
      .catch(() => {});
  }, [id]);

  // Auto-save with debounce
  useEffect(() => {
    if (!dirty || !currentNote) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      updateNote(currentNote.id, { title: currentNote.title });
      setDirty(false);
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [dirty, currentNote, updateNote, setDirty]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!currentNote) return;
      // Optimistically update in the store
      updateNote(currentNote.id, { title: e.target.value });
      setDirty(true);
    },
    [currentNote, updateNote, setDirty],
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

        {/* Backlink panel */}
        <div className="mx-auto max-w-3xl px-4 pb-6">
          <Separator className="mb-4" />
          <button
            onClick={() => setBacklinksOpen(!backlinksOpen)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {backlinksOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <LinkIcon className="h-4 w-4" />
            Backlinks ({backlinks.length})
          </button>

          {backlinksOpen && (
            <div className="mt-3 space-y-2 pl-6">
              {backlinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other notes link to this one.
                </p>
              ) : (
                backlinks.map((link) => {
                  const noteInfo = backlinkNotes.get(link.sourceNoteId);
                  return (
                    <button
                      key={link.id}
                      onClick={() => navigate(`/notes/${link.sourceNoteId}`)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors w-full text-left"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">
                        {noteInfo?.title ?? link.sourceNoteId}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </ScrollArea>

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
