import React, { useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function CalloutBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const icon = (block.meta.icon as string) || '\u{1F4A1}';

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
      <Card className="bg-muted/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Input
            value={icon}
            onChange={(e) =>
              onUpdate(block.content, { ...block.meta, icon: e.target.value })
            }
            className={cn(
              'w-12 shrink-0 border-none shadow-none p-0 h-auto text-center text-lg',
              'focus-visible:ring-0 focus-visible:ring-offset-0'
            )}
          />
          <Textarea
            ref={textareaRef}
            value={block.content}
            onChange={(e) => {
              onUpdate(e.target.value);
              autoResize();
            }}
            onKeyDown={onKeyDown}
            className={cn(
              'flex-1 resize-none border-none shadow-none p-0 min-h-0 bg-transparent',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'text-base'
            )}
            rows={1}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="text-lg shrink-0 select-none">{icon}</span>
        <span className="text-base">{block.content}</span>
      </CardContent>
    </Card>
  );
}
