import { useCallback, useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { api } from '@/api/client';
import { useNoteStore } from '@/store/noteStore';
import { toBlockNote, fromBlockNote } from '@/lib/blocknote-adapter';
import type { Block } from '@/types';

interface BlockEditorProps {
  blocks: Block[];
  noteId: string;
}

const SAVE_DEBOUNCE_MS = 800;

/**
 * Web block editor, powered by BlockNote. OctoNote's flat block model is
 * translated to/from BlockNote's document model via blocknote-adapter.
 *
 * The parent must mount this with `key={noteId}` so switching notes
 * remounts the editor with fresh initial content (`useCreateBlockNote`
 * captures `initialContent` once).
 */
export function BlockEditor({ blocks, noteId }: BlockEditorProps) {
  const setDirty = useNoteStore((s) => s.setDirty);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote({
    initialContent: blocks.length ? toBlockNote(blocks) : undefined,
  });

  const persist = useCallback(() => {
    const adapted = fromBlockNote(editor.document);
    return api.blocks.replace(noteId, adapted);
  }, [editor, noteId]);

  const handleChange = useCallback(() => {
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      await persist();
      setDirty(false);
    }, SAVE_DEBOUNCE_MS);
  }, [persist, setDirty]);

  // Flush a pending save when unmounting (e.g. navigating away mid-debounce).
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void persist();
      }
    };
  }, [persist]);

  return <BlockNoteView editor={editor} onChange={handleChange} />;
}
