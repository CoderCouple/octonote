import React, { useState, useEffect } from 'react';
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
  const [suggestions, setSuggestions] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!query) {
        const notes = await container.noteRepository.listNotes();
        if (!cancelled) setSuggestions(notes.slice(0, 10));
      } else {
        const allNotes = await container.noteRepository.listNotes();
        container.searchEngine.rebuildIndex(allNotes);
        const results = container.searchEngine.search(query, { limit: 10 });
        if (!cancelled) setSuggestions(results.map(r => ({ id: r.id, title: r.title })));
      }
    })();
    return () => { cancelled = true; };
  }, [query, container]);

  const items = suggestions.map((n: { id: string; title: string }) => ({
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
