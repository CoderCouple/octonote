import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockProps {
  block: Block;
  isEditing: boolean;
  onUpdate: (content: string, meta?: Record<string, unknown>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function TableBlock({ block, isEditing, onUpdate, onKeyDown }: BlockProps) {
  const rows = (block.meta.rows as string[][]) || [];

  const updateCell = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      const newRows = rows.map((row) => [...row]);
      if (newRows[rowIndex]) {
        newRows[rowIndex][colIndex] = value;
        onUpdate(block.content, { ...block.meta, rows: newRows });
      }
    },
    [rows, block.content, block.meta, onUpdate]
  );

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed border-muted-foreground/25 p-8 text-muted-foreground text-sm">
        Empty table
      </div>
    );
  }

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);

  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {headerRow.map((cell, colIndex) => (
              <th
                key={colIndex}
                className={cn(
                  'px-3 py-2 text-left font-semibold',
                  colIndex > 0 && 'border-l'
                )}
              >
                {isEditing ? (
                  <input
                    value={cell}
                    onChange={(e) => updateCell(0, colIndex, e.target.value)}
                    onKeyDown={onKeyDown}
                    className="w-full bg-transparent outline-none font-semibold"
                  />
                ) : (
                  cell
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr
              key={rowIndex + 1}
              className={cn(
                'border-b last:border-b-0',
                rowIndex % 2 === 1 && 'bg-muted/25'
              )}
            >
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  className={cn(
                    'px-3 py-2',
                    colIndex > 0 && 'border-l'
                  )}
                >
                  {isEditing ? (
                    <input
                      value={cell}
                      onChange={(e) =>
                        updateCell(rowIndex + 1, colIndex, e.target.value)
                      }
                      onKeyDown={onKeyDown}
                      className="w-full bg-transparent outline-none"
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
