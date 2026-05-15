import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { Note } from '@/types';

const today = new Date().toISOString();

const mockNotes: Note[] = [
  {
    id: 'note-1',
    title: 'My First Note',
    folderId: null,
    projectId: null,
    type: 'note',
    storageFmt: 'json',
    createdAt: today,
    updatedAt: today,
    blocks: [],
    tags: [{ id: 'tag-1', name: 'important' }],
  },
  {
    id: 'note-2',
    title: 'Second Note',
    folderId: null,
    projectId: null,
    type: 'note',
    storageFmt: 'json',
    createdAt: today,
    updatedAt: today,
    blocks: [],
    tags: [],
  },
];

const mockFetchNotes = vi.fn();
const mockCreateNote = vi.fn();
const mockDeleteNote = vi.fn();

vi.mock('@/store/noteStore', () => ({
  useNoteStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      notes: mockNotes,
      fetchNotes: mockFetchNotes,
      createNote: mockCreateNote,
      deleteNote: mockDeleteNote,
    }),
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      searchResults: [],
      search: vi.fn(),
    }),
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock matchMedia for useIsMobile hook
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders OctoNote branding', () => {
    renderSidebar();
    expect(screen.getByText('OctoNote')).toBeInTheDocument();
  });

  it('renders note items in the sidebar', () => {
    renderSidebar();
    expect(screen.getByText('My First Note')).toBeInTheDocument();
    expect(screen.getByText('Second Note')).toBeInTheDocument();
  });

  it('renders the New Note button', () => {
    renderSidebar();
    expect(screen.getByText('New Note')).toBeInTheDocument();
  });

  it('renders Quick Links', () => {
    renderSidebar();
    expect(screen.getByText('Graph')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  it('calls fetchNotes on mount', () => {
    renderSidebar();
    expect(mockFetchNotes).toHaveBeenCalled();
  });
});
