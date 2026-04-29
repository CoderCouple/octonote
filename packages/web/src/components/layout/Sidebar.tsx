import { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Settings,
  Users,
  PenLine,
} from 'lucide-react';
import { useNoteStore } from '@/store/noteStore';
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
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavSection } from './NavSection';
import { NavQuickLinks } from './NavQuickLinks';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();

  const notes = useNoteStore((s) => s.notes);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const createNote = useNoteStore((s) => s.createNote);

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = useCallback(async () => {
    if (!newNoteTitle.trim()) return;
    const note = await createNote({ title: newNoteTitle.trim() });
    setNewNoteTitle('');
    setDialogOpen(false);
    if (note) {
      navigate(`/notes/${note.id}`);
    }
  }, [newNoteTitle, createNote, navigate]);

  // Categorize notes by tags
  const { generalNotes, meetingNotes, diagramNotes } = useMemo(() => {
    const meetings: typeof notes = [];
    const diagrams: typeof notes = [];
    const general: typeof notes = [];

    for (const note of notes) {
      const tagNames = note.tags?.map((t) => t.name.toLowerCase()) ?? [];
      if (tagNames.includes('meeting')) {
        meetings.push(note);
      } else if (tagNames.includes('diagram')) {
        diagrams.push(note);
      } else {
        general.push(note);
      }
    }

    return {
      generalNotes: general,
      meetingNotes: meetings,
      diagramNotes: diagrams,
    };
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
          <SidebarMenuItem>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateNote}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <NavSection
              label="Notes"
              icon={FileText}
              notes={generalNotes}
              defaultOpen
            />
            <NavSection
              label="Meetings"
              icon={Users}
              notes={meetingNotes}
            />
            <NavSection
              label="Diagrams"
              icon={PenLine}
              notes={diagramNotes}
            />
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
    </Sidebar>
  );
}
