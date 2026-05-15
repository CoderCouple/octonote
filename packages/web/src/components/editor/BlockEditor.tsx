import { useCreateBlockNote, BlockNoteViewRaw } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/core/style.css';
import type { Block } from '@/types';

interface BlockEditorProps {
  blocks: Block[];
  noteId: string;
}

/** DIAGNOSTIC step 2: use BlockNoteViewRaw (no UI variant). If this still
 *  crashes, the bug is in core itself, not the mantine/shadcn wrappers. */
export function BlockEditor(_props: BlockEditorProps) {
  const editor = useCreateBlockNote();
  return <BlockNoteViewRaw editor={editor} />;
}
