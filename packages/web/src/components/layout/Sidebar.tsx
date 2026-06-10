import { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Settings,
  FolderKanban,
  Mic,
  Users,
  PenLine,
  ClipboardList,
  GitBranch,
  AlertTriangle,
  BookMarked,
  Lightbulb,
  Bookmark,
  Wand2,
  Shuffle,
  Bot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MeetingRecorder } from '@/components/meeting/MeetingRecorder';
import { useNoteStore } from '@/store/noteStore';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavSection } from './NavSection';
import { NavQuickLinks } from './NavQuickLinks';
import type { Note, NoteType } from '@/types';

// Type sections shown in the sidebar. Primary types are always visible (even
// when empty); secondary types only appear when they have notes.
const TYPE_META: Record<NoteType, { label: string; icon: LucideIcon }> = {
  note: { label: 'Notes', icon: FileText },
  plan: { label: 'Plans', icon: ClipboardList },
  diagram: { label: 'Diagrams', icon: PenLine },
  meeting: { label: 'Meetings', icon: Users },
  decision: { label: 'Decisions', icon: GitBranch },
  gotcha: { label: 'Gotchas', icon: AlertTriangle },
  reference: { label: 'References', icon: BookMarked },
  explanation: { label: 'Explanations', icon: Lightbulb },
};
const PRIMARY_TYPES: NoteType[] = ['note', 'plan', 'diagram', 'meeting'];
const SECONDARY_TYPES: NoteType[] = ['decision', 'gotcha', 'reference', 'explanation'];

// Singular labels for the Create dropdown (e.g. "New plan", not "New plans").
const CREATE_LABEL: Record<NoteType, string> = {
  note: 'Note',
  plan: 'Plan',
  diagram: 'Diagram',
  meeting: 'Meeting',
  decision: 'Decision',
  gotcha: 'Gotcha',
  reference: 'Reference',
  explanation: 'Explanation',
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();

  const notes = useNoteStore((s) => s.notes);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const createNote = useNoteStore((s) => s.createNote);

  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const initProjectWs = useProjectStore((s) => s.initWebSocket);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const [recorderOpen, setRecorderOpen] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchProjects();
    initProjectWs();
  }, [fetchNotes, fetchProjects, initProjectWs]);

  // Instant-create: no title prompt, just "Untitled" — user renames inline.
  const handleQuickCreate = useCallback(
    async (type: NoteType) => {
      const note = await createNote({ title: 'Untitled', type });
      if (note) navigate(`/notes/${note.id}`);
    },
    [createNote, navigate],
  );

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) return;
    await createProject({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
    });
    setNewProjectName('');
    setNewProjectDesc('');
    setProjectDialogOpen(false);
  }, [newProjectName, newProjectDesc, createProject]);

  // Group notes by type. Untyped legacy notes fall back to 'note'.
  const byType = useMemo(() => {
    const map = new Map<NoteType, Note[]>();
    for (const note of notes) {
      const t = (note.type ?? 'note') as NoteType;
      const list = map.get(t) ?? [];
      list.push(note);
      map.set(t, list);
    }
    return map;
  }, [notes]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="OctoNote"
              onClick={() => navigate('/')}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <FileText className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">OctoNote</span>
                <span className="truncate text-xs">Notes</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* One Create button — opens a menu of options with icons. */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Create">
                  <Plus />
                  <span>Create</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-48">
                {PRIMARY_TYPES.map((type) => {
                  const Icon = TYPE_META[type].icon;
                  if (type === 'meeting') {
                    return (
                      <DropdownMenuItem key={type} onClick={() => setRecorderOpen(true)}>
                        <Mic className="text-muted-foreground" />
                        <span>Meeting</span>
                      </DropdownMenuItem>
                    );
                  }
                  return (
                    <DropdownMenuItem key={type} onClick={() => handleQuickCreate(type)}>
                      <Icon className="text-muted-foreground" />
                      <span>{CREATE_LABEL[type]}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProjectDialogOpen(true)}>
                  <FolderKanban className="text-muted-foreground" />
                  <span>Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          {/* Project dialog — still needs a name up-front. */}
          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                }}
                autoFocus
              />
              <Input
                placeholder="Description (optional)..."
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {PRIMARY_TYPES.map((type) => (
              <NavSection
                key={type}
                label={TYPE_META[type].label}
                icon={TYPE_META[type].icon}
                notes={byType.get(type) ?? []}
                defaultOpen
              />
            ))}
            {SECONDARY_TYPES.filter((t) => (byType.get(t)?.length ?? 0) > 0).map(
              (type) => (
                <NavSection
                  key={type}
                  label={TYPE_META[type].label}
                  icon={TYPE_META[type].icon}
                  notes={byType.get(type)!}
                />
              ),
            )}

            {/* Tools — same menu, just flat entries below the type sections */}
            {[
              { label: 'Bookmarks', icon: Bookmark, path: '/bookmarks' },
              { label: 'Composer', icon: Wand2, path: '/composer' },
              { label: 'Transformer', icon: Shuffle, path: '/transformer' },
              { label: 'Agents', icon: Bot, path: '/agents' },
            ].map((tool) => (
              <SidebarMenuItem key={tool.path}>
                <SidebarMenuButton
                  tooltip={tool.label}
                  onClick={() => navigate(tool.path)}
                >
                  <tool.icon />
                  <span>{tool.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <NavQuickLinks />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      <MeetingRecorder open={recorderOpen} onOpenChange={setRecorderOpen} />
    </Sidebar>
  );
}
