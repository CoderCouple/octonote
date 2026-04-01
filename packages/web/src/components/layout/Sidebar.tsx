import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteStore } from '@/store/noteStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import {
  FileText,
  Search,
  Tag as TagIcon,
  Plus,
  Network,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

export function Sidebar() {
  const navigate = useNavigate();

  const notes = useNoteStore((s) => s.notes);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const createNote = useNoteStore((s) => s.createNote);

  const searchResults = useUiStore((s) => s.searchResults);
  const search = useUiStore((s) => s.search);

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Debounced search
  useEffect(() => {
    if (!searchInput.trim()) return;
    const timer = setTimeout(() => {
      search(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // Collect unique tags from all notes
  const allTags = useMemo(() => {
    const tagSet = new Map<string, string>();
    for (const note of notes) {
      if (note.tags) {
        for (const tag of note.tags) {
          tagSet.set(tag.name, tag.id);
        }
      }
    }
    return Array.from(tagSet.entries()).map(([name, id]) => ({ id, name }));
  }, [notes]);

  // Filter notes by selected tag
  const filteredNotes = useMemo(() => {
    if (!selectedTag) return notes;
    return notes.filter(
      (note) => note.tags?.some((t) => t.name === selectedTag),
    );
  }, [notes, selectedTag]);

  const handleCreateNote = useCallback(async () => {
    if (!newNoteTitle.trim()) return;
    const note = await createNote({ title: newNoteTitle.trim() });
    setNewNoteTitle('');
    setDialogOpen(false);
    if (note) {
      navigate(`/notes/${note.id}`);
    }
  }, [newNoteTitle, createNote, navigate]);

  const handleSearchSelect = useCallback(
    (noteId: string) => {
      navigate(`/notes/${noteId}`);
    },
    [navigate],
  );

  const handleTagClick = useCallback(
    (tagName: string) => {
      if (selectedTag === tagName) {
        setSelectedTag(null);
      } else {
        setSelectedTag(tagName);
      }
    },
    [selectedTag],
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="notes" className="flex flex-1 flex-col">
        <TabsList className="mx-3 mt-3 w-auto">
          <TabsTrigger value="notes" className="flex-1 gap-1">
            <FileText className="h-3.5 w-3.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 gap-1">
            <Search className="h-3.5 w-3.5" />
            Search
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex-1 gap-1">
            <TagIcon className="h-3.5 w-3.5" />
            Tags
          </TabsTrigger>
        </TabsList>

        {/* Notes Tab */}
        <TabsContent value="notes" className="flex-1 overflow-hidden">
          <div className="px-3 py-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-1">
                  <Plus className="h-4 w-4" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
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
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateNote}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-0.5 px-2">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    'transition-colors',
                  )}
                >
                  <span className="font-medium leading-tight">
                    {note.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(note.updatedAt)}
                  </span>
                </button>
              ))}
              {filteredNotes.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No notes found.
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="flex-1 overflow-hidden">
          <Command className="border-none" shouldFilter={false}>
            <CommandInput
              placeholder="Search notes..."
              value={searchInput}
              onValueChange={setSearchInput}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Results">
                {searchResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSearchSelect(result.id)}
                    className="flex flex-col items-start gap-1"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">{result.title}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {Math.round(result.score * 100)}%
                      </Badge>
                    </div>
                    {result.snippet && (
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {result.snippet}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-3 py-2">
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTag === tag.name ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => handleTagClick(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
              {allTags.length === 0 && (
                <p className="w-full py-4 text-center text-sm text-muted-foreground">
                  No tags yet.
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Bottom navigation links */}
      <Separator />
      <div className="flex items-center gap-1 p-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1"
          onClick={() => navigate('/graph')}
        >
          <Network className="h-4 w-4" />
          Graph
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1"
          onClick={() => navigate('/daily')}
        >
          <Calendar className="h-4 w-4" />
          Daily
        </Button>
      </div>
    </div>
  );
}
