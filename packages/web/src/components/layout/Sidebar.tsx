import { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Settings,
  FolderKanban,
  Mic,
} from 'lucide-react';
import { MeetingRecorder } from '@/components/meeting/MeetingRecorder';
import { useNoteStore } from '@/store/noteStore';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ProjectNav } from './ProjectNav';
import { NavQuickLinks } from './NavQuickLinks';
import type { Note, NoteType } from '@/types';

const NOTE_TYPES: NoteType[] = [
  'note', 'meeting', 'diagram', 'plan', 'decision', 'gotcha', 'reference', 'explanation',
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();

  const notes = useNoteStore((s) => s.notes);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const createNote = useNoteStore((s) => s.createNote);

  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const initProjectWs = useProjectStore((s) => s.initWebSocket);

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteProject, setNewNoteProject] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>('note');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const [recorderOpen, setRecorderOpen] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchProjects();
    initProjectWs();
  }, [fetchNotes, fetchProjects, initProjectWs]);

  const handleCreateNote = useCallback(async () => {
    if (!newNoteTitle.trim()) return;
    const note = await createNote({
      title: newNoteTitle.trim(),
      projectId: newNoteProject || undefined,
      type: newNoteType,
    });
    setNewNoteTitle('');
    setNewNoteProject('');
    setNewNoteType('note');
    setNoteDialogOpen(false);
    if (note) navigate(`/notes/${note.id}`);
  }, [newNoteTitle, newNoteProject, newNoteType, createNote, navigate]);

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

  // Group notes by project; notes with no project go to "Unassigned".
  const { byProject, unassigned } = useMemo(() => {
    const map = new Map<string, Note[]>();
    const loose: Note[] = [];
    for (const note of notes) {
      if (note.projectId) {
        const list = map.get(note.projectId) ?? [];
        list.push(note);
        map.set(note.projectId, list);
      } else {
        loose.push(note);
      }
    }
    return { byProject: map, unassigned: loose };
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

          {/* New Note */}
          <SidebarMenuItem>
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton tooltip="New Note">
                  <Plus />
                  <span>New Note</span>
                </SidebarMenuButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                </DialogHeader>
                <Input
                  placeholder="Note title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNote();
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newNoteProject}
                    onChange={(e) => setNewNoteProject(e.target.value)}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value as NoteType)}
                  >
                    {NOTE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateNote}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>

          {/* New Meeting (AI transcription) */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Start transcribing"
              onClick={() => setRecorderOpen(true)}
            >
              <Mic />
              <span>Start transcribing</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* New Project */}
          <SidebarMenuItem>
            <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton tooltip="New Project">
                  <FolderKanban />
                  <span>New Project</span>
                </SidebarMenuButton>
              </DialogTrigger>
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {projects.map((p) => (
          <ProjectNav
            key={p.id}
            label={p.name}
            notes={byProject.get(p.id) ?? []}
            defaultOpen
          />
        ))}
        {unassigned.length > 0 && (
          <ProjectNav label="Unassigned" notes={unassigned} defaultOpen />
        )}
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
