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

export function ImageBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const urlInputRef = useRef<HTMLInputElement>(null);
  const alt = (block.meta.alt as string) || '';

  useEffect(() => {
    if (isEditing && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="space-y-2">
        {block.content && (
          <img
            src={block.content}
            alt={alt}
            className="max-w-full rounded-md"
          />
        )}
        <Input
          ref={urlInputRef}
          value={block.content}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Image URL..."
          className={cn(
            'w-full text-sm',
            'focus-visible:ring-1'
          )}
        />
        <Input
          value={alt}
          onChange={(e) =>
            onUpdate(block.content, { ...block.meta, alt: e.target.value })
          }
          onKeyDown={onKeyDown}
          placeholder="Alt text..."
          className={cn(
            'w-full text-sm',
            'focus-visible:ring-1'
          )}
        />
      </div>
    );
  }

  if (!block.content) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed border-muted-foreground/25 p-8 text-muted-foreground text-sm">
        No image URL
      </div>
    );
  }

  return (
    <figure>
      <img
        src={block.content}
        alt={alt}
        className="max-w-full rounded-md"
      />
      {alt && (
        <figcaption className="mt-1 text-sm text-muted-foreground text-center">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}
