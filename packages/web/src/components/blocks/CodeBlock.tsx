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

export function CodeBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const language = (block.meta.language as string) || 'text';

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
      <div className="rounded-md bg-muted overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 border-b border-border">
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
        </div>
        <Textarea
          ref={textareaRef}
          value={block.content}
          onChange={(e) => {
            onUpdate(e.target.value);
            autoResize();
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full resize-none border-none shadow-none rounded-none',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'font-mono text-sm bg-muted p-3 min-h-0'
          )}
          rows={1}
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="rounded-md bg-muted overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="font-mono text-sm">{block.content}</code>
      </pre>
    </div>
  );
}
