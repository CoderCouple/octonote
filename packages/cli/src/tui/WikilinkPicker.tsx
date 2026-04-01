import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { Container } from '@octonote/core';

interface WikilinkPickerProps {
  container: Container;
  onSelect: (title: string) => void;
  onCancel: () => void;
}

export function WikilinkPicker({ container, onSelect }: WikilinkPickerProps): React.ReactElement {
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => {
    if (!query) {
      // Show recent notes
      return container.noteRepository.listNotes().slice(0, 10);
    }
    // Rebuild index and search
    const allNotes = container.noteRepository.listNotes();
    container.searchEngine.rebuildIndex(allNotes);
    const results = container.searchEngine.search(query, { limit: 10 });
    return results.map(r => ({ id: r.id, title: r.title }));
  }, [query, container]);

  const items = suggestions.map(n => ({
    label: n.title,
    value: n.title,
  }));

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="magenta">[[</Text>
        <TextInput value={query} onChange={setQuery} placeholder="Search notes..." />
      </Box>
      {items.length > 0 && (
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      )}
    </Box>
  );
}
