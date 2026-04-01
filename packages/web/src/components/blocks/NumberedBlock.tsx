import React, { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function NumberedBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const number = (block.meta.number as number) || block.position + 1;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground select-none shrink-0 tabular-nums min-w-[1.5ch] text-right">
        {number}.
      </span>
      {isEditing ? (
        <Input
          ref={inputRef}
          value={block.content}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            'flex-1 border-none shadow-none p-0 h-auto',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'text-base'
          )}
        />
      ) : (
        <span className="text-base">{block.content}</span>
      )}
    </div>
  );
}
