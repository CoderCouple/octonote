import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Link } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BacklinkPanelProps {
  noteId: string;
}

interface BacklinkEntry {
  link: Link;
  title: string;
}

export function BacklinkPanel({ noteId }: BacklinkPanelProps) {
  const navigate = useNavigate();

  const [backlinks, setBacklinks] = useState<BacklinkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Fetch backlinks when noteId changes
  useEffect(() => {
    let cancelled = false;

    async function fetchBacklinks() {
      setLoading(true);
      try {
        const data = await api.links.get(noteId);
        if (cancelled) return;

        // Resolve source note titles for each backlink
        const entries: BacklinkEntry[] = await Promise.all(
          data.backlinks.map(async (link) => {
            try {
              const note = await api.notes.get(link.sourceNoteId);
              return { link, title: note.title };
            } catch {
              return { link, title: 'Untitled' };
            }
          }),
        );

        if (!cancelled) {
          setBacklinks(entries);
        }
      } catch {
        if (!cancelled) {
          setBacklinks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBacklinks();

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  const handleNavigate = useCallback(
    (targetNoteId: string) => {
      navigate(`/notes/${targetNoteId}`);
    },
    [navigate],
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-1 px-2"
        onClick={toggleCollapsed}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform',
            !collapsed && 'rotate-90',
          )}
        />
        <span className="text-sm font-semibold">Backlinks</span>
        {!loading && (
          <span className="ml-1 text-xs text-muted-foreground">
            ({backlinks.length})
          </span>
        )}
      </Button>

      {!collapsed && (
        <div className="space-y-2 pl-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : backlinks.length > 0 ? (
            backlinks.map((entry) => (
              <Card
                key={entry.link.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => handleNavigate(entry.link.sourceNoteId)}
              >
                <CardHeader className="p-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {entry.title}
                  </CardTitle>
                </CardHeader>
                {entry.link.alias && (
                  <CardContent className="px-3 pb-3 pt-0">
                    <span className="text-xs text-muted-foreground">
                      alias: {entry.link.alias}
                    </span>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No backlinks
            </p>
          )}
        </div>
      )}
    </div>
  );
}
