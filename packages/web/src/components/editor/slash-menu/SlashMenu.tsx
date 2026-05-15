import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { Editor, Range } from '@tiptap/core';
import type { SlashItem } from './items';

interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
  editor: Editor;
  range: Range;
}

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);

    useEffect(() => {
      setSelected(0);
    }, [items]);

    const select = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (items.length === 0) return false;
        if (event.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowUp') {
          setSelected((s) => (s - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-menu">
          <div className="slash-menu-empty">No matches</div>
        </div>
      );
    }

    return (
      <div className="slash-menu">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              className={`slash-menu-item${i === selected ? ' is-selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => select(i)}
            >
              <Icon className="slash-menu-icon" size={16} />
              <span className="slash-menu-title">{item.title}</span>
              <span className="slash-menu-description">{item.description}</span>
            </button>
          );
        })}
      </div>
    );
  },
);
SlashMenu.displayName = 'SlashMenu';
