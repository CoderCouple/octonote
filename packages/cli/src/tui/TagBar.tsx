import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface TagBarProps {
  tags: string[];
  active: boolean;
  onChange: (tags: string[]) => void;
  onExit: () => void;
}

export function TagBar({ tags, active, onChange, onExit }: TagBarProps): React.ReactElement {
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((ch, key) => {
    if (!active) return;

    if (key.escape) {
      onExit();
    } else if (key.return && input.trim()) {
      const newTag = input.trim().replace(/^#/, '');
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput('');
    } else if (ch === 'd' && !input && tags.length > 0) {
      const idx = Math.min(selectedIndex, tags.length - 1);
      const newTags = tags.filter((_, i) => i !== idx);
      onChange(newTags);
      setSelectedIndex(Math.max(0, idx - 1));
    } else if (key.leftArrow && !input) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.rightArrow && !input) {
      setSelectedIndex(Math.min(tags.length - 1, selectedIndex + 1));
    }
  });

  return (
    <Box>
      <Text dimColor>Tags: </Text>
      {tags.map((tag, i) => (
        <Text key={tag} color="cyan" inverse={active && i === selectedIndex}>
          {` #${tag} `}
        </Text>
      ))}
      {active && (
        <Box marginLeft={1}>
          <Text color="cyan">#</Text>
          <TextInput value={input} onChange={setInput} placeholder="new tag" />
        </Box>
      )}
    </Box>
  );
}
