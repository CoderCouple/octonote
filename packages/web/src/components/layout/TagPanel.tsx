import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteStore } from '@/store/noteStore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag as TagIcon } from 'lucide-react';

export function TagPanel() {
  const navigate = useNavigate();
  const notes = useNoteStore((s) => s.notes);

  // Deduplicate tags across all notes
  const tags = useMemo(() => {
    const tagMap = new Map<string, { id: string; name: string; count: number }>();
    for (const note of notes) {
      if (note.tags) {
        for (const tag of note.tags) {
          const existing = tagMap.get(tag.name);
          if (existing) {
            existing.count += 1;
          } else {
            tagMap.set(tag.name, { id: tag.id, name: tag.name, count: 1 });
          }
        }
      }
    }
    return Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [notes]);

  const handleTagClick = (tagName: string) => {
    navigate(`/?tag=${encodeURIComponent(tagName)}`);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <TagIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">All Tags</h3>
        <span className="text-xs text-muted-foreground">({tags.length})</span>
      </div>

      <ScrollArea className="max-h-[400px]">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleTagClick(tag.name)}
              >
                {tag.name}
                <span className="ml-1 text-muted-foreground">
                  {tag.count}
                </span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tags in your vault yet. Add tags to your notes to see them here.
          </p>
        )}
      </ScrollArea>
    </div>
  );
}
