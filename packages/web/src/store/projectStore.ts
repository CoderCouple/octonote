import { create } from 'zustand';
import { api } from '@/api/client';
import { wsClient } from '@/api/ws';
import type { Project } from '@/types';

interface ProjectState {
  projects: Project[];
  loading: boolean;
}

interface ProjectActions {
  /** Fetch all projects. */
  fetchProjects(): Promise<void>;

  /** Create a project and prepend it to the list. */
  createProject(data: { name: string; description?: string; repo?: string }): Promise<Project>;

  /** Update a project's metadata. */
  updateProject(
    id: string,
    data: { name?: string; description?: string | null; repo?: string | null; status?: string },
  ): Promise<void>;

  /** Delete a project. */
  deleteProject(id: string): Promise<void>;

  /** Connect to WebSocket and auto-refresh on project events. */
  initWebSocket(): void;
}

export const useProjectStore = create<ProjectState & ProjectActions>()((set, get) => ({
  projects: [],
  loading: false,

  async fetchProjects() {
    set({ loading: true });
    try {
      const projects = await api.projects.list();
      set({ projects });
    } finally {
      set({ loading: false });
    }
  },

  async createProject(data) {
    const project = await api.projects.create(data);
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  async updateProject(id, data) {
    const updated = await api.projects.update(id, data);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  async deleteProject(id) {
    await api.projects.delete(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  initWebSocket() {
    wsClient.connect();
    const refresh = () => { get().fetchProjects(); };
    wsClient.on('project:created', refresh);
    wsClient.on('project:updated', refresh);
    wsClient.on('project:deleted', refresh);
  },
}));
