import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SearchResult } from '@/types';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('@/api/client', () => ({
  api: {
    search: {
      query: vi.fn(),
    },
  },
}));

import { useUiStore } from '@/store/uiStore';
import { api } from '@/api/client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeSearchResults: SearchResult[] = [
  {
    id: 'note-1',
    title: 'Matching Note',
    score: 2.0,
    snippet: '...keyword found here...',
    tags: ['work'],
  },
  {
    id: 'note-2',
    title: 'Another Match',
    score: 1.2,
    snippet: '...also has keyword...',
    tags: [],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('uiStore', () => {
  beforeEach(() => {
    // Reset only data fields, keep action functions
    useUiStore.setState({
      sidebarOpen: true,
      activePanel: 'notes',
      searchQuery: '',
      searchResults: [],
    });
    vi.clearAllMocks();
  });

  it('has correct initial state', () => {
    const state = useUiStore.getState();

    expect(state.sidebarOpen).toBe(true);
    expect(state.activePanel).toBe('notes');
    expect(state.searchQuery).toBe('');
    expect(state.searchResults).toEqual([]);
  });

  it('toggleSidebar() flips sidebarOpen', () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true);

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(false);

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it('setPanel() changes activePanel', () => {
    expect(useUiStore.getState().activePanel).toBe('notes');

    useUiStore.getState().setPanel('search');
    expect(useUiStore.getState().activePanel).toBe('search');

    useUiStore.getState().setPanel('graph');
    expect(useUiStore.getState().activePanel).toBe('graph');

    useUiStore.getState().setPanel('tags');
    expect(useUiStore.getState().activePanel).toBe('tags');

    useUiStore.getState().setPanel('notes');
    expect(useUiStore.getState().activePanel).toBe('notes');
  });

  it('search() updates searchQuery and searchResults', async () => {
    vi.mocked(api.search.query).mockResolvedValueOnce(fakeSearchResults);

    await useUiStore.getState().search('keyword');

    const state = useUiStore.getState();
    expect(state.searchQuery).toBe('keyword');
    expect(state.searchResults).toEqual(fakeSearchResults);
    expect(api.search.query).toHaveBeenCalledWith('keyword');
  });
});
