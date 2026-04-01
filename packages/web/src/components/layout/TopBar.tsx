import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteStore } from '@/store/noteStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { Menu, MoreHorizontal, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function TopBar() {
  const navigate = useNavigate();

  const currentNote = useNoteStore((s) => s.currentNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local title with currentNote
  useEffect(() => {
    if (currentNote) {
      setTitleValue(currentNote.title);
    }
  }, [currentNote]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle]);

  const handleTitleBlur = useCallback(async () => {
    setEditingTitle(false);
    if (!currentNote) return;

    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== currentNote.title) {
      // updateNote is assumed available on the store for title updates;
      // fall back to api.notes.update if the store method is not present
      const { api } = await import('@/api/client');
      await api.notes.update(currentNote.id, { title: trimmed });
      // Re-fetch the note to reflect the change
      const fetchNote = useNoteStore.getState().fetchNote;
      fetchNote(currentNote.id);
    }
  }, [currentNote, titleValue]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleBlur();
      }
      if (e.key === 'Escape') {
        setEditingTitle(false);
        if (currentNote) setTitleValue(currentNote.title);
      }
    },
    [handleTitleBlur, currentNote],
  );

  const handleDelete = useCallback(async () => {
    if (!currentNote) return;
    await deleteNote(currentNote.id);
    navigate('/');
  }, [currentNote, deleteNote, navigate]);

  return (
    <div
      className={cn(
        'flex h-14 items-center gap-2 border-b px-4',
        'bg-background',
      )}
    >
      {/* Hamburger -- mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Note title / app title */}
      <div className="flex flex-1 items-center justify-center min-w-0">
        {currentNote ? (
          editingTitle ? (
            <Input
              ref={inputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="max-w-md text-center font-semibold border-none shadow-none focus-visible:ring-1"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="truncate text-lg font-semibold hover:text-foreground/80 transition-colors"
            >
              {currentNote.title}
            </button>
          )
        ) : (
          <span className="text-lg font-semibold">OctoNote</span>
        )}
      </div>

      {/* Right side: tags + actions */}
      {currentNote && (
        <div className="flex items-center gap-2">
          {/* Tag badges */}
          <div className="hidden sm:flex items-center gap-1">
            {currentNote.tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Note actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
