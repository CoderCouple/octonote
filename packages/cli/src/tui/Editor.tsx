import React, { useReducer, useCallback, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import type { Container, Block, Note, BlockType } from '@octonote/core';
import { StatusBar } from './StatusBar.js';
import { BlockList } from './BlockList.js';
import { SlashMenu } from './SlashMenu.js';
import { WikilinkPicker } from './WikilinkPicker.js';
import { TagBar } from './TagBar.js';
import { saveNote as saveNoteUtil } from '../utils/saveNote.js';

// ── State & Actions ──────────────────────────

export type EditorMode = 'normal' | 'insert' | 'slash' | 'wikilink' | 'tag' | 'ai-prompt';

export interface EditorState {
  mode: EditorMode;
  noteId: string;
  title: string;
  blocks: Block[];
  tags: string[];
  cursorIndex: number;
  dirty: boolean;
}

type EditorAction =
  | { type: 'SET_MODE'; mode: EditorMode }
  | { type: 'MOVE_CURSOR'; delta: number }
  | { type: 'UPDATE_BLOCK'; index: number; content: string }
  | { type: 'INSERT_BLOCK'; after: number; block: Block }
  | { type: 'DELETE_BLOCK'; index: number }
  | { type: 'MOVE_BLOCK'; from: number; delta: number }
  | { type: 'TOGGLE_TODO'; index: number }
  | { type: 'SET_TAGS'; tags: string[] }
  | { type: 'MARK_SAVED' };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'MOVE_CURSOR': {
      const next = state.cursorIndex + action.delta;
      const clamped = Math.max(0, Math.min(next, state.blocks.length - 1));
      return { ...state, cursorIndex: clamped };
    }

    case 'UPDATE_BLOCK': {
      const blocks = [...state.blocks];
      blocks[action.index] = { ...blocks[action.index], content: action.content };
      return { ...state, blocks, dirty: true };
    }

    case 'INSERT_BLOCK': {
      const blocks = [...state.blocks];
      blocks.splice(action.after + 1, 0, action.block);
      // Reindex positions
      for (let i = 0; i < blocks.length; i++) blocks[i] = { ...blocks[i], position: i };
      return { ...state, blocks, cursorIndex: action.after + 1, dirty: true };
    }

    case 'DELETE_BLOCK': {
      if (state.blocks.length <= 1) return state;
      const blocks = state.blocks.filter((_, i) => i !== action.index);
      for (let i = 0; i < blocks.length; i++) blocks[i] = { ...blocks[i], position: i };
      const cursor = Math.min(state.cursorIndex, blocks.length - 1);
      return { ...state, blocks, cursorIndex: cursor, dirty: true };
    }

    case 'MOVE_BLOCK': {
      const target = action.from + action.delta;
      if (target < 0 || target >= state.blocks.length) return state;
      const blocks = [...state.blocks];
      [blocks[action.from], blocks[target]] = [blocks[target], blocks[action.from]];
      for (let i = 0; i < blocks.length; i++) blocks[i] = { ...blocks[i], position: i };
      return { ...state, blocks, cursorIndex: target, dirty: true };
    }

    case 'TOGGLE_TODO': {
      const block = state.blocks[action.index];
      if (block.type !== ('todo' as BlockType)) return state;
      const blocks = [...state.blocks];
      blocks[action.index] = {
        ...block,
        meta: { ...block.meta, checked: !block.meta.checked },
      };
      return { ...state, blocks, dirty: true };
    }

    case 'SET_TAGS':
      return { ...state, tags: action.tags, dirty: true };

    case 'MARK_SAVED':
      return { ...state, dirty: false };

    default:
      return state;
  }
}

// ── Editor Component ─────────────────────────

interface EditorProps {
  container: Container;
  note: Note;
}

export function Editor({ container, note }: EditorProps): React.ReactElement {
  const { exit } = useApp();

  const initialBlocks = note.blocks?.length
    ? note.blocks
    : [{
        id: 'initial',
        noteId: note.id,
        type: 'paragraph' as BlockType,
        content: '',
        meta: {},
        position: 0,
        parentId: null,
      }];

  const [state, dispatch] = useReducer(editorReducer, {
    mode: 'normal' as EditorMode,
    noteId: note.id,
    title: note.title,
    blocks: initialBlocks,
    tags: note.tags?.map(t => t.name) || [],
    cursorIndex: 0,
    dirty: false,
  });

  const doSave = useCallback(async () => {
    const freshNote = await container.noteRepository.getNote(state.noteId);
    if (freshNote) {
      await saveNoteUtil(container, freshNote, state.blocks);
      dispatch({ type: 'MARK_SAVED' });
    }
  }, [container, state.noteId, state.blocks]);

  const insertNewBlock = useCallback((blockType: BlockType) => {
    const newBlock: Block = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      noteId: state.noteId,
      type: blockType,
      content: '',
      meta: blockType === 'heading' ? { level: 2 } : blockType === 'todo' ? { checked: false } : {},
      position: 0,
      parentId: null,
    };
    dispatch({ type: 'INSERT_BLOCK', after: state.cursorIndex, block: newBlock });
    dispatch({ type: 'SET_MODE', mode: 'insert' });
  }, [state.noteId, state.cursorIndex]);

  // Input handling
  useInput((input, key) => {
    if (state.mode === 'normal') {
      // Navigation
      if (input === 'j' || key.downArrow) {
        dispatch({ type: 'MOVE_CURSOR', delta: 1 });
      } else if (input === 'k' || key.upArrow) {
        dispatch({ type: 'MOVE_CURSOR', delta: -1 });
      }
      // Enter insert mode
      else if (input === 'i' || key.return) {
        dispatch({ type: 'SET_MODE', mode: 'insert' });
      }
      // Add block after current
      else if (input === 'a') {
        insertNewBlock('paragraph' as BlockType);
      }
      // Delete block
      else if (input === 'd') {
        dispatch({ type: 'DELETE_BLOCK', index: state.cursorIndex });
      }
      // Move block up/down
      else if (input === 'K') {
        dispatch({ type: 'MOVE_BLOCK', from: state.cursorIndex, delta: -1 });
      } else if (input === 'J') {
        dispatch({ type: 'MOVE_BLOCK', from: state.cursorIndex, delta: 1 });
      }
      // Toggle todo
      else if (input === ' ') {
        dispatch({ type: 'TOGGLE_TODO', index: state.cursorIndex });
      }
      // Slash menu
      else if (input === '/') {
        dispatch({ type: 'SET_MODE', mode: 'slash' });
      }
      // Tag mode
      else if (input === 't') {
        dispatch({ type: 'SET_MODE', mode: 'tag' });
      }
      // Save
      else if (input === 's') {
        doSave();
      }
      // Save + quit
      else if (input === 'q') {
        if (state.dirty) doSave();
        exit();
      }
      // Quit without saving
      else if (input === 'Q') {
        exit();
      }
    } else if (state.mode === 'insert') {
      if (key.escape) {
        dispatch({ type: 'SET_MODE', mode: 'normal' });
      }
    } else if (state.mode === 'slash' || state.mode === 'wikilink' || state.mode === 'tag') {
      if (key.escape) {
        dispatch({ type: 'SET_MODE', mode: 'normal' });
      }
    } else if (state.mode === 'ai-prompt') {
      if (key.escape) {
        dispatch({ type: 'SET_MODE', mode: 'normal' });
      }
    }
  });

  const handleBlockChange = useCallback((index: number, content: string) => {
    dispatch({ type: 'UPDATE_BLOCK', index, content });
    // Detect wikilink trigger
    if (content.endsWith('[[')) {
      dispatch({ type: 'SET_MODE', mode: 'wikilink' });
    }
  }, []);

  const [aiPromptText, setAiPromptText] = useState('');
  const [aiCommand, setAiCommand] = useState('');

  const handleAiCommand = useCallback((command: string) => {
    setAiCommand(command);
    setAiPromptText('');
    dispatch({ type: 'SET_MODE', mode: 'ai-prompt' });
  }, []);

  const handleSlashSelect = useCallback((blockType: BlockType) => {
    insertNewBlock(blockType);
  }, [insertNewBlock]);

  const handleWikilinkSelect = useCallback((title: string) => {
    const block = state.blocks[state.cursorIndex];
    // Replace trailing [[ with [[Title]]
    const content = block.content.endsWith('[[')
      ? block.content.slice(0, -2) + `[[${title}]]`
      : block.content + `[[${title}]]`;
    dispatch({ type: 'UPDATE_BLOCK', index: state.cursorIndex, content });
    dispatch({ type: 'SET_MODE', mode: 'insert' });
  }, [state.blocks, state.cursorIndex]);

  const handleTagsChange = useCallback(async (tags: string[]) => {
    dispatch({ type: 'SET_TAGS', tags });
    // Sync tags to DB
    const currentTags = await container.noteRepository.getNoteTags(state.noteId);
    const currentNames = new Set(currentTags.map((t: { name: string }) => t.name));
    const newNames = new Set(tags);

    // Add new tags
    for (const name of tags) {
      if (!currentNames.has(name)) {
        await container.noteRepository.addTagToNote(state.noteId, name);
      }
    }
    // Remove deleted tags
    for (const tag of currentTags) {
      if (!newNames.has(tag.name)) {
        await container.noteRepository.removeTagFromNote(state.noteId, tag.id);
      }
    }
  }, [container, state.noteId]);

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24}>
      <TagBar
        tags={state.tags}
        active={state.mode === 'tag'}
        onChange={handleTagsChange}
        onExit={() => dispatch({ type: 'SET_MODE', mode: 'normal' })}
      />
      <Box flexDirection="column" flexGrow={1}>
        {state.mode === 'ai-prompt' ? (
          <Box flexDirection="column">
            <Text bold color="magenta">AI ({aiCommand}):</Text>
            <Box>
              <Text color="gray">Prompt: </Text>
              <TextInput
                value={aiPromptText}
                onChange={setAiPromptText}
                onSubmit={() => {
                  // AI execution would happen here with AiService
                  dispatch({ type: 'SET_MODE', mode: 'normal' });
                }}
              />
            </Box>
          </Box>
        ) : state.mode === 'slash' ? (
          <SlashMenu
            onSelect={handleSlashSelect}
            onAiCommand={handleAiCommand}
            onCancel={() => dispatch({ type: 'SET_MODE', mode: 'normal' })}
          />
        ) : state.mode === 'wikilink' ? (
          <WikilinkPicker
            container={container}
            onSelect={handleWikilinkSelect}
            onCancel={() => dispatch({ type: 'SET_MODE', mode: 'insert' })}
          />
        ) : (
          <BlockList
            blocks={state.blocks}
            cursorIndex={state.cursorIndex}
            editMode={state.mode === 'insert'}
            onBlockChange={handleBlockChange}
          />
        )}
      </Box>
      <StatusBar mode={state.mode} title={state.title} dirty={state.dirty} />
    </Box>
  );
}
