import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { BlockType } from '@octonote/core';

interface SlashMenuProps {
  onSelect: (type: BlockType) => void;
  onCancel: () => void;
}

const BLOCK_TYPES: Array<{ label: string; value: BlockType }> = [
  { label: 'Paragraph', value: 'paragraph' as BlockType },
  { label: 'Heading 1', value: 'heading' as BlockType },
  { label: 'Bullet List', value: 'bullet' as BlockType },
  { label: 'Numbered List', value: 'numbered' as BlockType },
  { label: 'Todo', value: 'todo' as BlockType },
  { label: 'Code', value: 'code' as BlockType },
  { label: 'Quote', value: 'quote' as BlockType },
  { label: 'Callout', value: 'callout' as BlockType },
  { label: 'Divider', value: 'divider' as BlockType },
];

export function SlashMenu({ onSelect }: SlashMenuProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">/ Block type:</Text>
      <SelectInput
        items={BLOCK_TYPES}
        onSelect={(item) => onSelect(item.value)}
      />
    </Box>
  );
}
