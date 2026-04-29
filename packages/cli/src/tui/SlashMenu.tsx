import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { BlockType } from '@octonote/core';

interface SlashMenuProps {
  onSelect: (type: BlockType) => void;
  onAiCommand?: (command: string) => void;
  onCancel: () => void;
}

const BLOCK_TYPES: Array<{ label: string; value: string }> = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'heading' },
  { label: 'Bullet List', value: 'bullet' },
  { label: 'Numbered List', value: 'numbered' },
  { label: 'Todo', value: 'todo' },
  { label: 'Code', value: 'code' },
  { label: 'Quote', value: 'quote' },
  { label: 'Callout', value: 'callout' },
  { label: 'Divider', value: 'divider' },
  { label: 'Diagram (Mermaid)', value: 'diagram' },
  { label: 'AI: Diagram', value: 'ai-diagram' },
  { label: 'AI: Summarize', value: 'ai-summarize' },
  { label: 'AI: Expand', value: 'ai-expand' },
  { label: 'AI: Auto-tag', value: 'ai-auto-tag' },
];

export function SlashMenu({ onSelect, onAiCommand }: SlashMenuProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">/ Block type:</Text>
      <SelectInput
        items={BLOCK_TYPES}
        onSelect={(item) => {
          if (item.value.startsWith('ai-') && onAiCommand) {
            onAiCommand(item.value);
          } else {
            onSelect(item.value as BlockType);
          }
        }}
      />
    </Box>
  );
}
