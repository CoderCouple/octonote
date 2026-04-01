import React from 'react';
import { Box } from 'ink';
import type { Block } from '@octonote/core';
import { BlockItem } from './BlockItem.js';

interface BlockListProps {
  blocks: Block[];
  cursorIndex: number;
  editMode: boolean;
  onBlockChange: (index: number, content: string) => void;
}

export function BlockList({ blocks, cursorIndex, editMode, onBlockChange }: BlockListProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {blocks.map((block, index) => (
        <BlockItem
          key={block.id}
          block={block}
          active={index === cursorIndex}
          editing={index === cursorIndex && editMode}
          onChange={(content) => onBlockChange(index, content)}
        />
      ))}
    </Box>
  );
}
