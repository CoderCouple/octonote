import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { Block, BlockType } from '@octonote/core';

interface BlockItemProps {
  block: Block;
  active: boolean;
  editing: boolean;
  onChange: (content: string) => void;
}

export function BlockItem({ block, active, editing, onChange }: BlockItemProps): React.ReactElement {
  const cursor = active ? '▸ ' : '  ';

  if (editing) {
    return (
      <Box>
        <Text color="green">{cursor}</Text>
        <Text dimColor>{blockPrefix(block)}</Text>
        <TextInput value={block.content} onChange={onChange} />
      </Box>
    );
  }

  return (
    <Box>
      <Text color={active ? 'yellow' : undefined}>{cursor}</Text>
      <Text {...blockStyle(block)}>{blockPrefix(block)}{block.content}</Text>
    </Box>
  );
}

function blockPrefix(block: Block): string {
  switch (block.type as BlockType) {
    case 'heading': {
      const level = (block.meta.level as number) || 1;
      return '#'.repeat(level) + ' ';
    }
    case 'bullet': return '• ';
    case 'numbered': return `${block.position + 1}. `;
    case 'todo': return block.meta.checked ? '✓ ' : '○ ';
    case 'code': return '` ';
    case 'quote': return '│ ';
    case 'callout': return `[${(block.meta.calloutType as string) || '!'}] `;
    case 'divider': return '───';
    case 'diagram': return '◇ ';
    default: return '';
  }
}

function blockStyle(block: Block): { bold?: boolean; color?: string; dimColor?: boolean; strikethrough?: boolean } {
  switch (block.type as BlockType) {
    case 'heading': return { bold: true, color: 'cyan' };
    case 'bullet': return { color: 'white' };
    case 'todo':
      return block.meta.checked
        ? { strikethrough: true, dimColor: true }
        : {};
    case 'code': return { color: 'green' };
    case 'quote': return { color: 'gray' };
    case 'callout': return { color: 'blue' };
    case 'divider': return { dimColor: true };
    case 'diagram': return { color: 'magenta' };
    default: return {};
  }
}
