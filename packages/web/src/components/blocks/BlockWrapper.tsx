import React, { useState } from 'react';
import { GripVertical, MoreHorizontal, Trash2, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockWrapperProps {
  block: Block;
  children: React.ReactNode;
  onDelete: () => void;
  onDuplicate: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function BlockWrapper({
  block,
  children,
  onDelete,
  onDuplicate,
  isDragging = false,
  dragHandleProps = {},
}: BlockWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex items-start gap-1 rounded-md transition-colors',
        isHovered && 'bg-accent/50',
        isDragging && 'opacity-50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-block-id={block.id}
    >
      {/* Drag handle */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center w-6 pt-1 cursor-grab opacity-0 transition-opacity',
          isHovered && 'opacity-100'
        )}
        {...dragHandleProps}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0 py-1">{children}</div>

      {/* More actions menu */}
      <div
        className={cn(
          'flex shrink-0 items-center pt-1 opacity-0 transition-opacity',
          isHovered && 'opacity-100'
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-sm',
                'hover:bg-accent text-muted-foreground hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate block
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
