import { create } from 'zustand';
import { api } from '@/api/client';
import type { SearchResult } from '@/types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

type Panel = 'notes' | 'search' | 'tags' | 'graph';

interface UiState {
  sidebarOpen: boolean;
  activePanel: Panel;
  searchQuery: string;
  searchResults: SearchResult[];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface UiActions {
  /** Toggle the sidebar open / closed. */
  toggleSidebar(): void;

  /** Switch the active sidebar panel. */
  setPanel(panel: Panel): void;

  /** Run a search query and update results. */
  search(q: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUiStore = create<UiState & UiActions>()((set) => ({
  // -- State ----------------------------------------------------------------
  sidebarOpen: true,
  activePanel: 'notes',
  searchQuery: '',
  searchResults: [],

  // -- Actions --------------------------------------------------------------

  toggleSidebar() {
    set((s) => ({ sidebarOpen: !s.sidebarOpen }));
  },

  setPanel(panel) {
    set({ activePanel: panel });
  },

  async search(q) {
    set({ searchQuery: q });

    if (!q.trim()) {
      set({ searchResults: [] });
      return;
    }

    const results = await api.search.query(q);
    set({ searchResults: results });
  },
}));
