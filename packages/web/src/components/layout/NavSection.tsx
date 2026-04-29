import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Folder as FolderIcon,
  ChevronRight,
  MoreHorizontal,
  ArrowDownAZ,
  FolderTree,
  Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Note } from '@/types';
import { useNoteStore } from '@/store/noteStore';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'name' | 'hierarchy' | 'timeline';

const VIEW_MODES: { mode: ViewMode; icon: LucideIcon; label: string }[] = [
  { mode: 'name', icon: ArrowDownAZ, label: 'Name' },
  { mode: 'hierarchy', icon: FolderTree, label: 'Folders' },
  { mode: 'timeline', icon: Clock, label: 'Timeline' },
];

// ---------------------------------------------------------------------------
// Date grouping helpers
// ---------------------------------------------------------------------------

type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date();
  const date = new Date(dateStr);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This Week';
  return 'Older';
}

const GROUP_ORDER: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];

function groupNotesByDate(notes: Note[]): Map<DateGroup, Note[]> {
  const groups = new Map<DateGroup, Note[]>();
  for (const note of notes) {
    const group = getDateGroup(note.updatedAt);
    const list = groups.get(group);
    if (list) {
      list.push(note);
    } else {
      groups.set(group, [note]);
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Hierarchy helpers — group by folderId
// ---------------------------------------------------------------------------

interface FolderGroup {
  name: string;
  notes: Note[];
}

function groupByFolder(notes: Note[]): { folders: FolderGroup[]; loose: Note[] } {
  const folderMap = new Map<string, Note[]>();
  const loose: Note[] = [];

  for (const note of notes) {
    if (note.folderId) {
      const list = folderMap.get(note.folderId);
      if (list) {
        list.push(note);
      } else {
        folderMap.set(note.folderId, [note]);
      }
    } else {
      loose.push(note);
    }
  }

  const folders: FolderGroup[] = Array.from(folderMap.entries()).map(
    ([id, fnotes]) => ({ name: id, notes: fnotes }),
  );
  folders.sort((a, b) => a.name.localeCompare(b.name));

  return { folders, loose };
}

// ---------------------------------------------------------------------------
// Note item with action menu
// ---------------------------------------------------------------------------

function NoteItem({ note }: { note: Note }) {
  const navigate = useNavigate();
  const { id: activeNoteId } = useParams<{ id: string }>();
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const { isMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={note.id === activeNoteId}
        onClick={() => navigate(`/notes/${note.id}`)}
        tooltip={note.title}
      >
        <FileText />
        <span>{note.title}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-48 rounded-lg"
          side={isMobile ? 'bottom' : 'right'}
          align={isMobile ? 'end' : 'start'}
        >
          <DropdownMenuItem onClick={() => navigate(`/notes/${note.id}`)}>
            <FileText className="text-muted-foreground" />
            <span>Open</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteNote(note.id)}
          >
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

// ---------------------------------------------------------------------------
// Sub-note item (for nested display in collapsibles)
// ---------------------------------------------------------------------------

function SubNoteItem({ note }: { note: Note }) {
  const navigate = useNavigate();
  const { id: activeNoteId } = useParams<{ id: string }>();

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={note.id === activeNoteId}
      >
        <button onClick={() => navigate(`/notes/${note.id}`)}>
          <span>{note.title}</span>
        </button>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

// ---------------------------------------------------------------------------
// Render: Name view (A-Z flat list)
// ---------------------------------------------------------------------------

function renderNameView(notes: Note[]) {
  const sorted = [...notes].sort((a, b) => a.title.localeCompare(b.title));

  if (sorted.length === 0) {
    return (
      <SidebarMenuSubItem>
        <span className="px-2 py-1 text-xs text-muted-foreground">No notes</span>
      </SidebarMenuSubItem>
    );
  }

  return sorted.map((note) => <SubNoteItem key={note.id} note={note} />);
}

// ---------------------------------------------------------------------------
// Render: Hierarchy view (folder tree)
// ---------------------------------------------------------------------------

function renderHierarchyView(notes: Note[]) {
  const { folders, loose } = groupByFolder(notes);

  if (notes.length === 0) {
    return (
      <SidebarMenuSubItem>
        <span className="px-2 py-1 text-xs text-muted-foreground">No notes</span>
      </SidebarMenuSubItem>
    );
  }

  return (
    <>
      {folders.map((folder) => (
        <SidebarMenuSubItem key={folder.name}>
          <SidebarMenuSubButton className="pointer-events-none font-medium text-xs text-muted-foreground">
            <FolderIcon className="size-3" />
            <span>{folder.name}</span>
          </SidebarMenuSubButton>
          {folder.notes.map((note) => (
            <SubNoteItem key={note.id} note={note} />
          ))}
        </SidebarMenuSubItem>
      ))}
      {loose.map((note) => (
        <SubNoteItem key={note.id} note={note} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Render: Timeline view (date groups)
// ---------------------------------------------------------------------------

function TimelineItems({ notes }: { notes: Note[] }) {
  const grouped = useMemo(() => groupNotesByDate(notes), [notes]);

  if (notes.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton className="pointer-events-none text-xs text-muted-foreground">
          <span>No notes</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {GROUP_ORDER.map((groupName) => {
        const groupNotes = grouped.get(groupName);
        if (!groupNotes || groupNotes.length === 0) return null;

        return (
          <Collapsible key={groupName} asChild defaultOpen={groupName === 'Today'} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={groupName}>
                  <span>{groupName}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {groupNotes.map((note) => (
                    <SubNoteItem key={note.id} note={note} />
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// NavSection: A collapsible section with view mode switcher
// ---------------------------------------------------------------------------

interface NavSectionProps {
  label: string;
  icon: LucideIcon;
  notes: Note[];
  defaultOpen?: boolean;
}

export function NavSection({ label, icon: Icon, notes, defaultOpen = false }: NavSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  const ActiveViewIcon = VIEW_MODES.find((v) => v.mode === viewMode)!.icon;

  return (
    <Collapsible asChild defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={label}>
            <Icon />
            <span>{label}</span>
            <span className="ml-auto text-xs text-sidebar-foreground/50">{notes.length}</span>
            <ChevronRight className="ml-1 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {/* View mode action — hidden when sidebar is collapsed */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover className="group-data-[collapsible=icon]:hidden">
              <ActiveViewIcon />
              <span className="sr-only">View mode</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36 rounded-lg" side="right" align="start">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
            {VIEW_MODES.map(({ mode, icon: ModeIcon, label: modeLabel }) => (
              <DropdownMenuItem
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(viewMode === mode && 'bg-accent')}
              >
                <ModeIcon className="text-muted-foreground" />
                <span>{modeLabel}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
          <SidebarMenuSub>
            {viewMode === 'name' && renderNameView(notes)}
            {viewMode === 'hierarchy' && renderHierarchyView(notes)}
            {viewMode === 'timeline' && <TimelineItems notes={notes} />}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
