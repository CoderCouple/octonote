import React, { useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function QuoteBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [block.content, autoResize]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="border-l-4 border-primary pl-4">
        <Textarea
          ref={textareaRef}
          value={block.content}
          onChange={(e) => {
            onUpdate(e.target.value);
            autoResize();
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full resize-none border-none shadow-none p-0 min-h-0',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'text-base italic text-muted-foreground'
          )}
          rows={1}
        />
      </div>
    );
  }

  return (
    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
      {block.content}
    </blockquote>
  );
}
