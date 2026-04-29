import React, { useRef, useEffect, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

let renderCounter = 0;

export function DiagramBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState('');

  const renderDiagram = useCallback(async (source: string) => {
    if (!source.trim()) {
      setSvgHtml('');
      setError('');
      return;
    }
    try {
      const id = `mermaid-${block.id}-${++renderCounter}`;
      const { svg } = await mermaid.render(id, source);
      setSvgHtml(svg);
      setError('');
    } catch (err) {
      setError((err as Error).message || 'Invalid Mermaid syntax');
      setSvgHtml('');
    }
  }, [block.id]);

  useEffect(() => {
    renderDiagram(block.content);
  }, [block.content, renderDiagram]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const diagramType = (block.meta.diagramType as string) || 'diagram';

  if (isEditing) {
    return (
      <div className="rounded-md border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 bg-muted border-b border-border">
          <span className="text-xs text-purple-400 font-mono">mermaid ({diagramType})</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border">
          <Textarea
            ref={textareaRef}
            value={block.content}
            onChange={(e) => onUpdate(e.target.value, block.meta)}
            onKeyDown={onKeyDown}
            className={cn(
              'w-full resize-none border-none shadow-none rounded-none',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'font-mono text-sm bg-muted p-3 min-h-[120px]'
            )}
            spellCheck={false}
            placeholder="graph TD&#10;  A --> B"
          />
          <div className="p-3 min-h-[120px] flex items-center justify-center bg-background">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : svgHtml ? (
              <div
                ref={containerRef}
                className="w-full [&>svg]:max-w-full [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Preview</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-muted border-b border-border">
        <span className="text-xs text-purple-400 font-mono">mermaid ({diagramType})</span>
      </div>
      <div className="p-4 flex items-center justify-center bg-background">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : svgHtml ? (
          <div
            ref={containerRef}
            className="w-full [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <pre className="font-mono text-sm text-muted-foreground">{block.content}</pre>
        )}
      </div>
    </div>
  );
}
