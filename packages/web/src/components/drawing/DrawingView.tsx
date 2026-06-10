import { useCallback, useEffect, useRef } from 'react';
import { Tldraw, type Editor, type TLEditorSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { useNoteStore } from '@/store/noteStore';
import type { Note } from '@/types';
import './drawing.css';

interface DrawingViewProps {
  note: Note;
}

const SAVE_DEBOUNCE_MS = 1500;

/**
 * Full-page tldraw canvas for diagram-type notes. The snapshot is auto-saved to
 * the note's `drawing` column (JSONB) ~1.5s after the user stops drawing.
 */
export function DrawingView({ note }: DrawingViewProps) {
  const updateNote = useNoteStore((s) => s.updateNote);

  const editorRef = useRef<Editor | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJsonRef = useRef<string>('');

  // Persist initial snapshot JSON for the dirty-check on mount.
  useEffect(() => {
    lastSavedJsonRef.current = note.drawing ? JSON.stringify(note.drawing) : '';
  }, [note.id, note.drawing]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Hydrate from the saved snapshot if present.
      if (note.drawing) {
        try {
          editor.loadSnapshot(note.drawing as unknown as TLEditorSnapshot);
        } catch (err) {
          console.warn('Failed to load tldraw snapshot:', err);
        }
      }

      // Listen for user-driven changes only — ignore programmatic changes
      // (like the initial loadSnapshot above) so we don't re-save what we
      // just loaded.
      const unlisten = editor.store.listen(
        () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            const snapshot = editor.getSnapshot();
            const json = JSON.stringify(snapshot);
            if (json === lastSavedJsonRef.current) return;
            lastSavedJsonRef.current = json;
            updateNote(note.id, {
              drawing: snapshot as unknown as Record<string, unknown>,
            }).catch((err) => console.error('Failed to save drawing:', err));
          }, SAVE_DEBOUNCE_MS);
        },
        { source: 'user', scope: 'document' },
      );

      return unlisten;
    },
    [note.id, note.drawing, updateNote],
  );

  // Flush any pending save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        const editor = editorRef.current;
        if (editor) {
          const snapshot = editor.getSnapshot();
          const json = JSON.stringify(snapshot);
          if (json !== lastSavedJsonRef.current) {
            updateNote(note.id, {
              drawing: snapshot as unknown as Record<string, unknown>,
            }).catch(() => {});
          }
        }
      }
    };
  }, [note.id, updateNote]);

  return (
    <div className="drawing-view">
      <Tldraw onMount={handleMount} />
    </div>
  );
}
