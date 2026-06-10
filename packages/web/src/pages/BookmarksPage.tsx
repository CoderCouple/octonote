import { useCallback, useEffect, useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  Plus,
  Trash2,
  ExternalLink,
  FolderPlus,
} from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Bookmark, BookmarkGroup } from '@/types';

export function BookmarksPage() {
  const [groups, setGroups] = useState<BookmarkGroup[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState('');

  const [bookmarkDialog, setBookmarkDialog] = useState(false);
  const [bmTitle, setBmTitle] = useState('');
  const [bmUrl, setBmUrl] = useState('');
  const [bmGroup, setBmGroup] = useState('');
  const [bmDescription, setBmDescription] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [g, b] = await Promise.all([
        api.bookmarks.listGroups(),
        api.bookmarks.list(),
      ]);
      setGroups(g);
      setBookmarks(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    await api.bookmarks.createGroup(groupName.trim());
    setGroupName('');
    setGroupDialog(false);
    refresh();
  };

  const handleCreateBookmark = async () => {
    if (!bmTitle.trim() || !bmUrl.trim() || !bmGroup) return;
    await api.bookmarks.create({
      groupId: bmGroup,
      title: bmTitle.trim(),
      url: bmUrl.trim(),
      description: bmDescription.trim() || undefined,
    });
    setBmTitle('');
    setBmUrl('');
    setBmDescription('');
    setBookmarkDialog(false);
    refresh();
  };

  const handleDeleteBookmark = async (id: string) => {
    await api.bookmarks.delete(id);
    setBookmarks((b) => b.filter((x) => x.id !== id));
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group and all its bookmarks?')) return;
    await api.bookmarks.deleteGroup(id);
    refresh();
  };

  const byGroup = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    const list = byGroup.get(b.groupId) ?? [];
    list.push(b);
    byGroup.set(b.groupId, list);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Bookmarks</h1>
          <span className="text-sm text-muted-foreground">
            {bookmarks.length} links · {groups.length} groups
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGroupDialog(true)}>
            <FolderPlus className="size-4" /> New group
          </Button>
          <Button
            onClick={() => {
              setBmGroup(groups[0]?.id ?? '');
              setBookmarkDialog(true);
            }}
            disabled={groups.length === 0}
          >
            <Plus className="size-4" /> Add bookmark
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <BookmarkIcon className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">No bookmark groups yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a group to start organising your links.
            </p>
            <Button className="mt-6" onClick={() => setGroupDialog(true)}>
              <FolderPlus className="size-4" /> Create first group
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => {
              const items = byGroup.get(g.id) ?? [];
              return (
                <section key={g.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold">
                      {g.name}{' '}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        ({items.length})
                      </span>
                    </h2>
                    <button
                      onClick={() => handleDeleteGroup(g.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Delete group
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No bookmarks yet — add one with the button above.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((b) => (
                        <BookmarkCard
                          key={b.id}
                          bookmark={b}
                          onDelete={() => handleDeleteBookmark(b.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* New-group dialog */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Group name…"
            value={groupName}
            autoFocus
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New-bookmark dialog */}
      <Dialog open={bookmarkDialog} onOpenChange={setBookmarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add bookmark</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Title…"
            value={bmTitle}
            autoFocus
            onChange={(e) => setBmTitle(e.target.value)}
          />
          <Input
            placeholder="https://…"
            value={bmUrl}
            onChange={(e) => setBmUrl(e.target.value)}
          />
          <Input
            placeholder="Description (optional)…"
            value={bmDescription}
            onChange={(e) => setBmDescription(e.target.value)}
          />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={bmGroup}
            onChange={(e) => setBmGroup(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookmarkDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBookmark}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookmarkCard({
  bookmark,
  onDelete,
}: {
  bookmark: Bookmark;
  onDelete: () => void;
}) {
  let host = '';
  try { host = new URL(bookmark.url).hostname.replace(/^www\./, ''); } catch { /* invalid url */ }
  const favicon = host
    ? `https://www.google.com/s2/favicons?domain=${host}&sz=64`
    : null;
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
      <a
        href={bookmark.url}
        target="_blank"
        rel="noreferrer"
        className="block"
      >
        <div className="flex items-center gap-2">
          {favicon ? (
            <img src={favicon} alt="" className="size-5 rounded-sm" />
          ) : (
            <BookmarkIcon className="size-4 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium text-foreground">
            {bookmark.title}
          </span>
        </div>
        {bookmark.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {bookmark.description}
          </p>
        )}
        <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <ExternalLink className="size-3 shrink-0" /> {host || bookmark.url}
        </p>
      </a>
      <button
        onClick={onDelete}
        aria-label="Delete bookmark"
        className="absolute right-2 top-2 hidden rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:block"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
