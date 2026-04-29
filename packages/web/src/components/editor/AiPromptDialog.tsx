import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { useNoteStore } from '@/store/noteStore';
import { api } from '@/api/client';

const COMMAND_LABELS: Record<string, string> = {
  'ai-diagram': 'Generate Diagram',
  'ai-summarize': 'Summarize Note',
  'ai-expand': 'Expand Note',
  'ai-auto-tag': 'Auto-tag Note',
  'ai-generate': 'Generate Content',
};

const COMMAND_PREFILLS: Record<string, string> = {
  'ai-diagram': 'Generate a diagram showing ',
  'ai-summarize': 'Summarize this note, highlighting the key points.',
  'ai-expand': 'Expand this note with more detail and examples.',
  'ai-auto-tag': 'Analyze this note and suggest relevant tags.',
  'ai-generate': '',
};

interface AiPromptDialogProps {
  noteId: string;
  command: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiPromptDialog({ noteId, command, open, onOpenChange }: AiPromptDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const fetchNote = useNoteStore((s) => s.fetchNote);

  const label = command ? COMMAND_LABELS[command] || 'AI Command' : 'AI Command';

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen && command) {
      setPrompt(COMMAND_PREFILLS[command] || '');
    }
    onOpenChange(isOpen);
  }, [command, onOpenChange]);

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      await api.ai.run(trimmed);
    } catch {
      // Error handling is non-blocking
    } finally {
      setLoading(false);
      fetchNote(noteId);
      onOpenChange(false);
    }
  }, [prompt, loading, noteId, fetchNote, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            {label}
          </DialogTitle>
          <DialogDescription>
            Describe what you want the AI to do.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe your request..."
          rows={4}
          className="resize-none"
          disabled={loading}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!prompt.trim() || loading} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
