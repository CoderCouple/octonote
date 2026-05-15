import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { Markdown } from 'tiptap-markdown';
import { SlashMenuExtension } from './slash-menu/slash-menu-extension';
import { Callout } from './extensions/Callout';
import { Mermaid } from './extensions/Mermaid';
import { Wikilink } from './extensions/Wikilink';
import { GithubCard } from './extensions/GithubCard';
import { LinkPreview } from './extensions/LinkPreview';
import { MathBlock, MathInline } from './extensions/Math';
import 'tippy.js/dist/tippy.css';
import 'katex/dist/katex.min.css';
import { api } from '@/api/client';
import { useNoteStore } from '@/store/noteStore';
import { blocksToMarkdown, markdownToBlocks } from '@/lib/tiptap-adapter';
import type { Block } from '@/types';
import './editor.css';

interface BlockEditorProps {
  blocks: Block[];
  noteId: string;
}

const SAVE_DEBOUNCE_MS = 800;

/** Read the markdown string back from tiptap-markdown's storage entry. */
function getMarkdown(storage: unknown): string {
  return (storage as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
}

/**
 * Web block editor powered by Tiptap + tiptap-markdown. The editor's content
 * is a single markdown document; OctoNote's flat block model is assembled
 * to/from that markdown via `tiptap-adapter`.
 *
 * Parent must mount with `key={noteId}` so a fresh editor is created when
 * the user switches notes.
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
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      GlobalDragHandle.configure({ dragHandleWidth: 20, scrollTreshold: 100 }),
      SlashMenuExtension,
      Callout,
      Mermaid,
      Wikilink,
      GithubCard,
      LinkPreview,
      MathBlock,
      MathInline,
      Markdown.configure({ html: false, tightLists: true, transformPastedText: true }),
    ],
    content: blocksToMarkdown(blocks),
    onUpdate: ({ editor: ed }) => {
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        saveTimer.current = null;
        const md = getMarkdown(ed.storage);
        await api.blocks.replace(noteId, markdownToBlocks(md));
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
        const md = getMarkdown(editor.storage);
        void api.blocks.replace(noteId, markdownToBlocks(md));
      }
    };
  }, [editor, noteId]);

  return <EditorContent editor={editor} className="tiptap-editor" />;
}
