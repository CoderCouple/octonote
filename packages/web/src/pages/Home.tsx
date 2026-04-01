import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNoteStore } from '@/store/noteStore';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Plus, FileText } from 'lucide-react';
import type { Folder } from '@/types';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const notes = useNoteStore((s) => s.notes);
  const loading = useNoteStore((s) => s.loading);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const createNote = useNoteStore((s) => s.createNote);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const tagFilter = searchParams.get('tag') ?? undefined;
  const folderFilter = searchParams.get('folder') ?? undefined;
  const [selectedFolder, setSelectedFolder] = useState<string>(folderFilter ?? 'all');

  // Fetch notes on mount and when filters change
  useEffect(() => {
    const params: { folder?: string; tag?: string } = {};
    if (tagFilter) params.tag = tagFilter;
    if (selectedFolder && selectedFolder !== 'all') params.folder = selectedFolder;
    fetchNotes(params);
  }, [fetchNotes, tagFilter, selectedFolder]);

  // Fetch folders for the filter dropdown
  useEffect(() => {
    api.folders.list().then(setFolders).catch(() => {});
  }, []);

  // Local search filtering
  const filteredNotes = useMemo(() => {
    if (!searchInput.trim()) return notes;
    const q = searchInput.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.blocks?.some((b) => b.content.toLowerCase().includes(q)) ||
        note.tags?.some((t) => t.name.toLowerCase().includes(q)),
    );
  }, [notes, searchInput]);

  const handleCreateNote = useCallback(async () => {
    const title = newNoteTitle.trim();
    if (!title) return;
    const note = await createNote({ title });
    setNewNoteTitle('');
    setDialogOpen(false);
    navigate(`/notes/${note.id}`);
  }, [newNoteTitle, createNote, navigate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSnippet = (note: typeof notes[number]) => {
    const firstBlock = note.blocks?.[0];
    if (!firstBlock) return '';
    const text = firstBlock.content;
    return text.length > 120 ? text.slice(0, 120) + '...' : text;
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top bar with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Notes</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search notes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Enter a title for your new note.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNote();
                }}
                autoFocus
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNote} disabled={!newNoteTitle.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Note cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-3 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">No notes found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new note to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-base leading-tight line-clamp-1">
                  {note.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getSnippet(note)}
                </p>
                {note.tags && note.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <span className="text-xs text-muted-foreground">
                  {formatDate(note.updatedAt)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
