import { useEffect, useRef, useMemo } from 'react';
import { useNoteStore } from '@/store/noteStore';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { FileText } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WikilinkPopoverProps {
  onSelect: (noteTitle: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WikilinkPopover({
  onSelect,
  onClose,
  position,
}: WikilinkPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const notes = useNoteStore((s) => s.notes);

  const noteTitles = useMemo(
    () => notes.map((n) => n.title).filter(Boolean),
    [notes],
  );

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 50,
      }
    : {
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 50,
      };

  return (
    <div ref={containerRef} style={style}>
      <Command className="w-72 rounded-lg border shadow-md bg-popover">
        <CommandInput placeholder="Search notes to link..." autoFocus />
        <CommandList>
          <CommandEmpty>No notes found.</CommandEmpty>
          <CommandGroup heading="Notes">
            {noteTitles.map((title) => (
              <CommandItem
                key={title}
                value={title}
                onSelect={() => onSelect(title)}
                className="gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
