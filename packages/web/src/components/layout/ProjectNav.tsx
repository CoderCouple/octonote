import { useMemo } from 'react';
import {
  FileText,
  Users,
  PenLine,
  ClipboardList,
  GitBranch,
  AlertTriangle,
  BookMarked,
  Lightbulb,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { NavSection } from './NavSection';
import type { Note, NoteType } from '@/types';

const TYPE_META: Record<NoteType, { label: string; icon: LucideIcon }> = {
  note: { label: 'Notes', icon: FileText },
  meeting: { label: 'Meetings', icon: Users },
  diagram: { label: 'Diagrams', icon: PenLine },
  plan: { label: 'Plans', icon: ClipboardList },
  decision: { label: 'Decisions', icon: GitBranch },
  gotcha: { label: 'Gotchas', icon: AlertTriangle },
  reference: { label: 'References', icon: BookMarked },
  explanation: { label: 'Explanations', icon: Lightbulb },
};

const TYPE_ORDER: NoteType[] = [
  'note', 'meeting', 'diagram', 'plan', 'decision', 'gotcha', 'reference', 'explanation',
];

interface ProjectNavProps {
  /** Group heading — a project name, or e.g. "Unassigned". */
  label: string;
  /** All notes belonging to this group. */
  notes: Note[];
  /** Open the type sections by default. */
  defaultOpen?: boolean;
}

/** A project group in the sidebar: notes split into collapsible sections by type. */
export function ProjectNav({ label, notes, defaultOpen }: ProjectNavProps) {
  const byType = useMemo(() => {
    const map = new Map<NoteType, Note[]>();
    for (const note of notes) {
      const list = map.get(note.type) ?? [];
      list.push(note);
      map.set(note.type, list);
    }
    return map;
  }, [notes]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {TYPE_ORDER.filter((t) => byType.has(t)).map((type) => (
          <NavSection
            key={type}
            label={TYPE_META[type].label}
            icon={TYPE_META[type].icon}
            notes={byType.get(type)!}
            defaultOpen={defaultOpen}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
