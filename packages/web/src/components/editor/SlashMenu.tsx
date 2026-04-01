import { useEffect, useRef } from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  AlertCircle,
  Minus,
  Image as ImageIcon,
  Table2,
} from 'lucide-react';
import { BlockType } from '@/types';

// ---------------------------------------------------------------------------
// Block type menu items
// ---------------------------------------------------------------------------

interface SlashMenuItem {
  type: BlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  meta?: Record<string, unknown>;
}

const MENU_ITEMS: SlashMenuItem[] = [
  { type: BlockType.Paragraph, label: 'Paragraph', icon: Type },
  { type: BlockType.Heading, label: 'Heading 1', icon: Heading1, meta: { level: 1 } },
  { type: BlockType.Heading, label: 'Heading 2', icon: Heading2, meta: { level: 2 } },
  { type: BlockType.Heading, label: 'Heading 3', icon: Heading3, meta: { level: 3 } },
  { type: BlockType.Bullet, label: 'Bullet List', icon: List },
  { type: BlockType.Numbered, label: 'Numbered List', icon: ListOrdered },
  { type: BlockType.Todo, label: 'Todo', icon: CheckSquare },
  { type: BlockType.Code, label: 'Code', icon: Code },
  { type: BlockType.Quote, label: 'Quote', icon: Quote },
  { type: BlockType.Callout, label: 'Callout', icon: AlertCircle },
  { type: BlockType.Divider, label: 'Divider', icon: Minus },
  { type: BlockType.Image, label: 'Image', icon: ImageIcon },
  { type: BlockType.Table, label: 'Table', icon: Table2 },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SlashMenuProps {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SlashMenu({ onSelect, onClose, position }: SlashMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      <Command className="w-64 rounded-lg border shadow-md bg-popover">
        <CommandInput placeholder="Filter block type..." autoFocus />
        <CommandList>
          <CommandEmpty>No block type found.</CommandEmpty>
          <CommandGroup heading="Block Types">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.label}
                  value={item.label}
                  onSelect={() => onSelect(item.type)}
                  className="gap-2 cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
