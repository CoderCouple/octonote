import type { Editor, Range } from '@tiptap/core';
import {
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  ListTodo,
  Code,
  Quote,
  Minus,
  Image as ImageIcon,
  Table,
  Lightbulb,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SlashItem {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Run by the slash menu after deleting the trigger range. */
  command: (args: { editor: Editor; range: Range }) => void;
}

/** All slash-menu commands. Filtered by `query` substring at runtime. */
export const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Paragraph',
    description: 'Plain text',
    icon: Pilcrow,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'Heading 1',
    description: 'Top-level section',
    icon: Heading1,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Section',
    icon: Heading2,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Subsection',
    icon: Heading3,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet list',
    description: 'Unordered list',
    icon: List,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    description: 'Ordered list',
    icon: ListOrdered,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Task list',
    description: 'Checkbox list',
    icon: ListTodo,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'Code block',
    description: 'Monospaced code',
    icon: Code,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Quote',
    description: 'Block quote',
    icon: Quote,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: Minus,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: '3×3 table',
    icon: Table,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Embed an image by URL',
    icon: ImageIcon,
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL');
      if (!url) return;
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    },
  },
  {
    title: 'Callout',
    description: 'Highlighted info box',
    icon: Lightbulb,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCallout({ icon: '💡' }).run(),
  },
  {
    title: 'Mermaid diagram',
    description: 'Live-rendered mermaid graph',
    icon: Workflow,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'mermaid',
          attrs: { source: 'graph TD;\n  A-->B;' },
        })
        .run(),
  },
];

export function filterItems(query: string): SlashItem[] {
  if (!query) return SLASH_ITEMS;
  const q = query.toLowerCase();
  return SLASH_ITEMS.filter((item) => item.title.toLowerCase().includes(q));
}
