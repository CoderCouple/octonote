import React from 'react';
import { Separator } from '@/components/ui/separator';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function DividerBlock(_props: BlockProps) {
  return (
    <div className="py-2">
      <Separator />
    </div>
  );
}
