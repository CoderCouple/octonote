import * as fs from 'fs';
import * as path from 'path';
import { watch, FSWatcher } from 'chokidar';
import { Block, Note, VaultConfig, StorageFormat } from '../models/types';
import { BlockEngine } from './BlockEngine';

const DEFAULT_CONFIG: Omit<VaultConfig, 'vaultPath'> = {
  storageFmt: 'json',
};

export class VaultManager {
  private vaultPath: string;
  private blockEngine: BlockEngine;
  private watcher: FSWatcher | null = null;

  constructor(vaultPath: string, blockEngine: BlockEngine) {
    this.vaultPath = vaultPath;
    this.blockEngine = blockEngine;
  }

  /**
   * Ensure the vault directory and config exist.
   */
  ensureVault(): void {
    const vaultDir = path.join(this.vaultPath, 'vault');
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }

    const configPath = path.join(this.vaultPath, 'config.json');
    if (!fs.existsSync(configPath)) {
      const config: VaultConfig = { vaultPath: this.vaultPath, ...DEFAULT_CONFIG };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }
  }

  /**
   * Save a note to the vault filesystem.
   */
  saveNote(note: Note, blocks: Block[]): string {
    const vaultDir = path.join(this.vaultPath, 'vault');
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }

    const safeTitle = note.title.replace(/[<>:"/\\|?*]/g, '_');

    if (note.storageFmt === 'markdown') {
      const filePath = path.join(vaultDir, `${safeTitle}.md`);
      const frontmatter: Record<string, unknown> = {
        id: note.id,
        title: note.title,
        created: note.createdAt,
        updated: note.updatedAt,
      };
      if (note.tags?.length) {
        frontmatter.tags = note.tags.map(t => t.name);
      }
      if (note.folderId) {
        frontmatter.folder = note.folderId;
      }
      const md = this.blockEngine.serializeToMarkdown(blocks, frontmatter);
      fs.writeFileSync(filePath, md, 'utf-8');
      return filePath;
    } else {
      const filePath = path.join(vaultDir, `${safeTitle}.note`);
      const data = {
        note: {
          id: note.id,
          title: note.title,
          folderId: note.folderId,
          storageFmt: note.storageFmt,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          tags: note.tags,
        },
        blocks,
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return filePath;
    }
  }

  /**
   * Load a note from a vault file.
   */
  loadNote(filePath: string): { note: Partial<Note>; blocks: Block[] } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);

    if (ext === '.md') {
      return this.importFromMarkdown(filePath);
    }

    // JSON .note format
    const data = JSON.parse(content);
    return { note: data.note, blocks: data.blocks };
  }

  /**
   * Export a note as markdown to a destination path.
   */
  exportToMarkdown(note: Note, blocks: Block[], destPath: string): void {
    const frontmatter: Record<string, unknown> = {
      id: note.id,
      title: note.title,
      created: note.createdAt,
      updated: note.updatedAt,
    };
    if (note.tags?.length) {
      frontmatter.tags = note.tags.map(t => t.name);
    }
    const md = this.blockEngine.serializeToMarkdown(blocks, frontmatter);
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(destPath, md, 'utf-8');
  }

  /**
   * Import a markdown file, parsing frontmatter and blocks.
   */
  importFromMarkdown(filePath: string): { note: Partial<Note>; blocks: Block[] } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { blocks, frontmatter } = this.blockEngine.parseMarkdown(content);

    const note: Partial<Note> = {
      title: (frontmatter.title as string) || path.basename(filePath, path.extname(filePath)),
      storageFmt: 'markdown' as StorageFormat,
      createdAt: (frontmatter.created as string) || new Date().toISOString(),
      updatedAt: (frontmatter.updated as string) || new Date().toISOString(),
    };

    if (frontmatter.id) note.id = frontmatter.id as string;
    if (frontmatter.folder) note.folderId = frontmatter.folder as string;

    return { note, blocks };
  }

  /**
   * Read vault config.
   */
  getConfig(): VaultConfig {
    const configPath = path.join(this.vaultPath, 'config.json');
    if (!fs.existsSync(configPath)) {
      return { vaultPath: this.vaultPath, ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  }

  /**
   * Update vault config (partial merge).
   */
  setConfig(partial: Partial<VaultConfig>): VaultConfig {
    const current = this.getConfig();
    const updated = { ...current, ...partial };
    const configPath = path.join(this.vaultPath, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  /**
   * Watch the vault directory for external changes.
   */
  watchVault(callback: (event: string, filePath: string) => void): void {
    const vaultDir = path.join(this.vaultPath, 'vault');
    if (!fs.existsSync(vaultDir)) return;

    this.watcher = watch(vaultDir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    });

    this.watcher.on('add', (p) => callback('add', p));
    this.watcher.on('change', (p) => callback('change', p));
    this.watcher.on('unlink', (p) => callback('unlink', p));
  }

  /**
   * Stop watching the vault.
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
