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

const headingStyles: Record<number, { fontSize: string; className: string }> = {
  1: { fontSize: '2rem', className: 'text-[2rem] font-bold leading-tight' },
  2: { fontSize: '1.5rem', className: 'text-[1.5rem] font-semibold leading-tight' },
  3: { fontSize: '1.25rem', className: 'text-[1.25rem] font-medium leading-snug' },
};

export function HeadingBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const level = (block.meta.level as number) || 1;
  const style = headingStyles[level] || headingStyles[1];

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={block.content}
        onChange={(e) => onUpdate(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          'w-full border-none shadow-none p-0 h-auto',
          'focus-visible:ring-0 focus-visible:ring-offset-0',
          style.className
        )}
      />
    );
  }

  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

  return <Tag className={style.className}>{block.content}</Tag>;
}
