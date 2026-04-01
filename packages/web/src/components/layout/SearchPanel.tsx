import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

export function SearchPanel() {
  const navigate = useNavigate();

  const searchQuery = useUiStore((s) => s.searchQuery);
  const searchResults = useUiStore((s) => s.searchResults);
  const search = useUiStore((s) => s.search);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search calls by 300ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!localQuery.trim()) return;

    debounceRef.current = setTimeout(() => {
      search(localQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localQuery, search]);

  const handleSelect = useCallback(
    (noteId: string) => {
      navigate(`/notes/${noteId}`);
    },
    [navigate],
  );

  return (
    <div className="flex flex-col h-full">
      <Command className="rounded-lg border" shouldFilter={false}>
        <CommandInput
          placeholder="Search notes..."
          value={localQuery}
          onValueChange={setLocalQuery}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            {localQuery.trim()
              ? 'No results found.'
              : 'Type to search your notes.'}
          </CommandEmpty>
          <CommandGroup heading="Search Results">
            {searchResults.map((result) => (
              <CommandItem
                key={result.id}
                value={result.id}
                onSelect={() => handleSelect(result.id)}
                className="flex flex-col items-start gap-1 py-3"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">{result.title}</span>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                    {Math.round(result.score * 100)}%
                  </Badge>
                </div>
                {result.snippet && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {result.snippet}
                  </span>
                )}
                {result.tags.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {result.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
