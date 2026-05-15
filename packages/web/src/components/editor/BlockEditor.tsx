import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { Block } from '@/types';

interface BlockEditorProps {
  blocks: Block[];
  noteId: string;
}

/** TEMPORARY: minimal BlockNote hello-world to isolate the renderSpec crash.
 *  All adapter/load/save logic is stripped — if this renders, we know the
 *  environment is fine and the issue is in our integration. */
export function BlockEditor(_props: BlockEditorProps) {
  const editor = useCreateBlockNote();
  return <BlockNoteView editor={editor} />;
}
