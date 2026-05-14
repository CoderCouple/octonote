import { Block, Link, Note } from '../models/types';
import { NoteRepository } from '../db/NoteRepository';

export class LinkGraph {
  private repo: NoteRepository;

  constructor(repo: NoteRepository) {
    this.repo = repo;
  }

  /**
   * Extract wikilink targets from a string.
   * Matches [[Target]] and [[Target|alias]].
   */
  extractWikilinks(content: string): Array<{ target: string; alias: string | null }> {
    const regex = /\[\[([^\]]+?)\]\]/g;
    const links: Array<{ target: string; alias: string | null }> = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const inner = match[1];
      const parts = inner.split('|');
      links.push({
        target: parts[0].trim(),
        alias: parts.length > 1 ? parts[1].trim() : null,
      });
    }

    return links;
  }

  /**
   * Sync the links table for a note based on its current blocks.
   * Removes old outbound links and creates new ones.
   */
  async syncLinks(noteId: string, blocks: Block[]): Promise<void> {
    // Remove existing outbound links
    await this.repo.deleteLinksFromNote(noteId);

    // Extract all wikilinks from all blocks
    for (const block of blocks) {
      const wikilinks = this.extractWikilinks(block.content);
      for (const wl of wikilinks) {
        const targetNote = await this.repo.getNoteByTitle(wl.target);
        if (targetNote) {
          await this.repo.createLink(noteId, targetNote.id, block.id, wl.alias);
        }
      }
    }
  }

  /**
   * Get notes that link TO the given note (backlinks).
   */
  async getBacklinks(noteId: string): Promise<Link[]> {
    return this.repo.getBacklinks(noteId);
  }

  /**
   * Get notes that the given note links TO (forward links).
   */
  async getForwardLinks(noteId: string): Promise<Link[]> {
    return this.repo.getLinksFromNote(noteId);
  }

  /**
   * Find notes with no inbound or outbound links.
   */
  async getOrphans(): Promise<Note[]> {
    const allNotes = await this.repo.listNotes();
    const orphans: Note[] = [];
    for (const note of allNotes) {
      const inbound = await this.repo.getBacklinks(note.id);
      const outbound = await this.repo.getLinksFromNote(note.id);
      if (inbound.length === 0 && outbound.length === 0) {
        orphans.push(note);
      }
    }
    return orphans;
  }

  /**
   * Get graph data for visualization.
   */
  async getGraphData(): Promise<{ nodes: Array<{ id: string; title: string }>; edges: Array<{ source: string; target: string }> }> {
    const allNotes = await this.repo.listNotes();
    const nodes = allNotes.map(n => ({ id: n.id, title: n.title }));
    const edges: Array<{ source: string; target: string }> = [];

    for (const note of allNotes) {
      const links = await this.repo.getLinksFromNote(note.id);
      for (const link of links) {
        edges.push({ source: link.sourceNoteId, target: link.targetNoteId });
      }
    }

    return { nodes, edges };
  }
}
