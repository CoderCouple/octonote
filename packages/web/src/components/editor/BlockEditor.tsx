import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { api } from '@/api/client';
import { useNoteStore } from '@/store/noteStore';
import { toTiptap, fromTiptap } from '@/lib/tiptap-adapter';
import type { Block } from '@/types';
import './editor.css';

interface BlockEditorProps {
  blocks: Block[];
  noteId: string;
}

const SAVE_DEBOUNCE_MS = 800;

/**
 * Web block editor powered by Tiptap (ProseMirror). OctoNote's flat block
 * model is translated to/from Tiptap's document JSON via `tiptap-adapter`.
 *
 * The parent must mount with `key={noteId}` so a fresh editor is created
 * when the user switches notes.
 */
export function BlockEditor({ blocks, noteId }: BlockEditorProps) {
  const setDirty = useNoteStore((s) => s.setDirty);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
    ],
    content: blocks.length ? toTiptap(blocks) : undefined,
    onUpdate: ({ editor: ed }) => {
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        saveTimer.current = null;
        const adapted = fromTiptap(ed.getJSON());
        await api.blocks.replace(noteId, adapted);
        setDirty(false);
      }, SAVE_DEBOUNCE_MS);
    },
  });

  // Flush a pending save when unmounting.
  useEffect(() => {
    return () => {
      if (saveTimer.current && editor) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void api.blocks.replace(noteId, fromTiptap(editor.getJSON()));
      }
    };
  }, [editor, noteId]);

  return <EditorContent editor={editor} className="tiptap-editor" />;
}
