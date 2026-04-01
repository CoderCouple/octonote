import React, { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function TodoBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const checked = Boolean(block.meta.checked);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleToggle = () => {
    onUpdate(block.content, { ...block.meta, checked: !checked });
  };

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={handleToggle}
        className="mt-1 shrink-0"
      />
      {isEditing ? (
        <Input
          ref={inputRef}
          value={block.content}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            'flex-1 border-none shadow-none p-0 h-auto',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'text-base',
            checked && 'line-through text-muted-foreground'
          )}
        />
      ) : (
        <span
          className={cn(
            'text-base',
            checked && 'line-through text-muted-foreground'
          )}
        >
          {block.content}
        </span>
      )}
    </div>
  );
}
