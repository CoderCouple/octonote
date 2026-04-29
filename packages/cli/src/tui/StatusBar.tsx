import React from 'react';
import { Box, Text } from 'ink';
import type { EditorMode } from './Editor.js';

interface StatusBarProps {
  mode: EditorMode;
  title: string;
  dirty: boolean;
}

const MODE_HINTS: Record<EditorMode, string> = {
  normal: 'i:insert a:add d:del J/K:move /:slash t:tag s:save q:quit',
  insert: 'Esc:normal  [[: wikilink',
  slash: 'Select block type  Esc:cancel',
  wikilink: 'Search notes  Esc:cancel',
  tag: 'Enter:add  d:remove  Esc:done',
  'ai-prompt': 'Enter:submit  Esc:cancel',
};

const MODE_COLORS: Record<EditorMode, string> = {
  normal: 'blue',
  insert: 'green',
  slash: 'yellow',
  wikilink: 'magenta',
  tag: 'cyan',
  'ai-prompt': 'magenta',
};

export function StatusBar({ mode, title, dirty }: StatusBarProps): React.ReactElement {
  const modeLabel = mode.toUpperCase();
  const dirtyMark = dirty ? ' [+]' : '';

  return (
    <Box>
      <Text color={MODE_COLORS[mode]} bold inverse>{` ${modeLabel} `}</Text>
      <Text> {title}{dirtyMark} </Text>
      <Text dimColor>{MODE_HINTS[mode]}</Text>
    </Box>
  );
}
