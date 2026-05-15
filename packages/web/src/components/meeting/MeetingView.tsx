import { useState } from 'react';
import { Calendar, Pencil, Mic } from 'lucide-react';
import { BlockEditor } from '@/components/editor/BlockEditor';
import type { Note } from '@/types';
import './meeting.css';

interface MeetingViewProps {
  note: Note;
}

/**
 * Notion-style meeting layout. A "Meeting" card with two tabs:
 * - Notes: the AI-generated summary rendered with the regular Tiptap editor.
 * - Transcript: the raw Whisper transcript (read-only).
 */
export function MeetingView({ note }: MeetingViewProps) {
  const [tab, setTab] = useState<'notes' | 'transcript'>('notes');
  const transcript = (note.transcript ?? '').trim();

  return (
    <div className="meeting-view">
      <div className="meeting-card">
        <div className="meeting-card-header">
          <Calendar className="meeting-card-icon" size={16} />
          <span className="meeting-card-title">Meeting</span>
        </div>

        <div className="meeting-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'notes'}
            className={`meeting-tab${tab === 'notes' ? ' is-active' : ''}`}
            onClick={() => setTab('notes')}
          >
            <Pencil size={14} /> Notes
          </button>
          <button
            role="tab"
            aria-selected={tab === 'transcript'}
            className={`meeting-tab${tab === 'transcript' ? ' is-active' : ''}`}
            onClick={() => setTab('transcript')}
          >
            <Mic size={14} /> Transcript
          </button>
        </div>

        <div className="meeting-tab-panel">
          {tab === 'notes' ? (
            <BlockEditor
              key={note.id}
              blocks={note.blocks ?? []}
              noteId={note.id}
            />
          ) : transcript ? (
            <pre className="meeting-transcript">{transcript}</pre>
          ) : (
            <div className="meeting-transcript-empty">
              No transcript available — this meeting may have been created manually.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
