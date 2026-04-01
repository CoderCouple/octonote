import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function EmbedBlock({ block }: BlockProps) {
  const navigate = useNavigate();
  const noteTitle = block.content;
  const noteId = (block.meta.noteId as string) || block.content;

  const handleClick = () => {
    navigate(`/notes/${encodeURIComponent(noteId)}`);
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent/50',
        'border-dashed'
      )}
      onClick={handleClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="text-base font-medium text-primary hover:underline">
          {noteTitle || 'Untitled note'}
        </span>
      </CardContent>
    </Card>
  );
}
