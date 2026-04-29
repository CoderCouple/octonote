import React, { useState, useCallback, useMemo } from 'react';
import { useNoteStore } from '@/store/noteStore';
import { BlockWrapper } from '@/components/blocks/BlockWrapper';
import { ParagraphBlock } from '@/components/blocks/ParagraphBlock';
import { HeadingBlock } from '@/components/blocks/HeadingBlock';
import { BulletBlock } from '@/components/blocks/BulletBlock';
import { NumberedBlock } from '@/components/blocks/NumberedBlock';
import { TodoBlock } from '@/components/blocks/TodoBlock';
import { CodeBlock } from '@/components/blocks/CodeBlock';
import { QuoteBlock } from '@/components/blocks/QuoteBlock';
import { CalloutBlock } from '@/components/blocks/CalloutBlock';
import { DividerBlock } from '@/components/blocks/DividerBlock';
import { ImageBlock } from '@/components/blocks/ImageBlock';
import { EmbedBlock } from '@/components/blocks/EmbedBlock';
import { TableBlock } from '@/components/blocks/TableBlock';
import { DiagramBlock } from '@/components/blocks/DiagramBlock';
import { SlashMenu } from './SlashMenu';
import { AiPromptDialog } from './AiPromptDialog';
import { BlockType } from '@/types';
import type { Block } from '@/types';

// ---------------------------------------------------------------------------
// Block type -> component mapping
// ---------------------------------------------------------------------------

const BLOCK_COMPONENTS: Record<
  BlockType,
  React.ComponentType<{
    block: Block;
    isEditing: boolean;
    onUpdate: (content: string, meta?: Record<string, unknown>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  }>
> = {
  [BlockType.Paragraph]: ParagraphBlock,
  [BlockType.Heading]: HeadingBlock,
  [BlockType.Bullet]: BulletBlock,
  [BlockType.Numbered]: NumberedBlock,
  [BlockType.Todo]: TodoBlock,
  [BlockType.Code]: CodeBlock,
  [BlockType.Quote]: QuoteBlock,
  [BlockType.Callout]: CalloutBlock,
  [BlockType.Divider]: DividerBlock,
  [BlockType.Image]: ImageBlock,
  [BlockType.Embed]: EmbedBlock,
  [BlockType.Table]: TableBlock,
  [BlockType.Diagram]: DiagramBlock,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BlockEditorProps {
  blocks: Block[];
  noteId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlockEditor({ blocks, noteId }: BlockEditorProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean;
    position: { top: number; left: number };
    afterBlockId: string | null;
  }>({ open: false, position: { top: 0, left: 0 }, afterBlockId: null });
  const [aiDialog, setAiDialog] = useState<{ open: boolean; command: string | null }>({
    open: false,
    command: null,
  });

  const updateBlock = useNoteStore((s) => s.updateBlock);
  const deleteBlock = useNoteStore((s) => s.deleteBlock);
  const appendBlocks = useNoteStore((s) => s.appendBlocks);
  const setDirty = useNoteStore((s) => s.setDirty);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.position - b.position),
    [blocks],
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleUpdate = useCallback(
    (blockId: string, content: string, meta?: Record<string, unknown>) => {
      const data: { content?: string; meta?: Record<string, unknown> } = { content };
      if (meta) data.meta = meta;
      updateBlock(noteId, blockId, data);
      setDirty(true);
    },
    [noteId, updateBlock, setDirty],
  );

  const handleDelete = useCallback(
    (blockId: string) => {
      deleteBlock(noteId, blockId);
      setDirty(true);

      // Move editing focus to the previous block
      const idx = sortedBlocks.findIndex((b) => b.id === blockId);
      if (idx > 0) {
        setEditingBlockId(sortedBlocks[idx - 1].id);
      } else if (sortedBlocks.length > 1) {
        setEditingBlockId(sortedBlocks[1].id);
      } else {
        setEditingBlockId(null);
      }
    },
    [noteId, deleteBlock, setDirty, sortedBlocks],
  );

  const handleDuplicate = useCallback(
    (block: Block) => {
      appendBlocks(noteId, [
        {
          type: block.type,
          content: block.content,
          meta: { ...block.meta },
        } as Block,
      ]);
      setDirty(true);
    },
    [noteId, appendBlocks, setDirty],
  );

  const createBlockAfter = useCallback(
    (type: BlockType, _afterBlockId?: string) => {
      const newBlock = {
        type,
        content: '',
        meta: type === BlockType.Heading ? { level: 1 } : {},
      } as Block;
      appendBlocks(noteId, [newBlock]);
      setDirty(true);
    },
    [noteId, appendBlocks, setDirty],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, block: Block) => {
      const idx = sortedBlocks.findIndex((b) => b.id === block.id);

      if (e.key === 'Enter' && !e.shiftKey) {
        // For code blocks, allow Enter to add newlines normally
        if (block.type === BlockType.Code) return;
        e.preventDefault();
        createBlockAfter(BlockType.Paragraph, block.id);
      } else if (e.key === 'Backspace' && block.content === '') {
        // Delete empty block
        if (sortedBlocks.length > 1) {
          e.preventDefault();
          handleDelete(block.id);
        }
      } else if (e.key === 'ArrowUp') {
        if (idx > 0) {
          e.preventDefault();
          setEditingBlockId(sortedBlocks[idx - 1].id);
        }
      } else if (e.key === 'ArrowDown') {
        if (idx < sortedBlocks.length - 1) {
          e.preventDefault();
          setEditingBlockId(sortedBlocks[idx + 1].id);
        }
      } else if (e.key === '/') {
        // Only open slash menu when content is empty or cursor is at the start
        if (block.content === '') {
          e.preventDefault();
          const target = e.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          setSlashMenu({
            open: true,
            position: { top: rect.bottom + 4, left: rect.left },
            afterBlockId: block.id,
          });
        }
      }
    },
    [sortedBlocks, createBlockAfter, handleDelete],
  );

  const handleSlashSelect = useCallback(
    (type: BlockType) => {
      setSlashMenu((prev) => ({ ...prev, open: false }));
      createBlockAfter(type, slashMenu.afterBlockId ?? undefined);
    },
    [createBlockAfter, slashMenu.afterBlockId],
  );

  const handleSlashClose = useCallback(() => {
    setSlashMenu((prev) => ({ ...prev, open: false }));
  }, []);

  const handleAiCommand = useCallback((command: string) => {
    setSlashMenu((prev) => ({ ...prev, open: false }));
    setAiDialog({ open: true, command });
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (sortedBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">
          Type &apos;/&apos; for commands
        </p>
        <button
          onClick={() => createBlockAfter(BlockType.Paragraph)}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Add a block
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {sortedBlocks.map((block) => {
        const BlockComponent = BLOCK_COMPONENTS[block.type];
        if (!BlockComponent) return null;
        const isEditing = editingBlockId === block.id;

        return (
          <div
            key={block.id}
            onClick={() => setEditingBlockId(block.id)}
          >
            <BlockWrapper
              block={block}
              onDelete={() => handleDelete(block.id)}
              onDuplicate={() => handleDuplicate(block)}
            >
              <BlockComponent
                block={block}
                isEditing={isEditing}
                onUpdate={(content, meta) => handleUpdate(block.id, content, meta)}
                onKeyDown={(e) => handleKeyDown(e, block)}
              />
            </BlockWrapper>
          </div>
        );
      })}

      {slashMenu.open && (
        <SlashMenu
          onSelect={handleSlashSelect}
          onClose={handleSlashClose}
          onAiCommand={handleAiCommand}
          position={slashMenu.position}
        />
      )}

      <AiPromptDialog
        noteId={noteId}
        command={aiDialog.command}
        open={aiDialog.open}
        onOpenChange={(open) => setAiDialog((prev) => ({ ...prev, open }))}
      />
    </div>
  );
}
