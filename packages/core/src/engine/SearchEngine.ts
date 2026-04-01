import MiniSearch from 'minisearch';
import * as fs from 'fs';
import { Note, SearchResult } from '../models/types';

interface SearchDoc {
  id: string;
  title: string;
  body: string;
  tags: string;
}

export class SearchEngine {
  private index: MiniSearch<SearchDoc>;
  private indexPath: string;

  constructor(indexPath: string) {
    this.indexPath = indexPath;
    this.index = new MiniSearch<SearchDoc>({
      fields: ['title', 'body', 'tags'],
      storeFields: ['title', 'tags'],
      searchOptions: {
        boost: { title: 3, tags: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    this.loadIndex();
  }

  indexNote(note: Note): void {
    const doc = this.noteToDoc(note);
    // Remove existing if present, then add
    if (this.index.has(doc.id)) {
      this.index.discard(doc.id);
    }
    this.index.add(doc);
    this.persistIndex();
  }

  removeNote(noteId: string): void {
    if (this.index.has(noteId)) {
      this.index.discard(noteId);
      this.persistIndex();
    }
  }

  search(query: string, options?: { limit?: number }): SearchResult[] {
    const results = this.index.search(query, {
      fuzzy: 0.2,
      prefix: true,
    });

    const limited = options?.limit ? results.slice(0, options.limit) : results;

    return limited.map(r => ({
      id: r.id,
      title: (r as any).title || '',
      score: r.score,
      snippet: this.extractSnippet(r),
      tags: ((r as any).tags || '').split(',').filter(Boolean),
    }));
  }

  autocomplete(prefix: string): SearchResult[] {
    const results = this.index.autoSuggest(prefix, {
      fuzzy: 0.2,
    });

    return results.map(r => ({
      id: '',
      title: r.suggestion,
      score: r.score,
      snippet: '',
      tags: [],
    }));
  }

  rebuildIndex(notes: Note[]): void {
    this.index.removeAll();
    const docs = notes.map(n => this.noteToDoc(n));
    this.index.addAll(docs);
    this.persistIndex();
  }

  private noteToDoc(note: Note): SearchDoc {
    const body = (note.blocks || []).map(b => b.content).join('\n');
    const tags = (note.tags || []).map(t => t.name).join(',');
    return { id: note.id, title: note.title, body, tags };
  }

  private extractSnippet(result: any): string {
    return result.title || '';
  }

  private loadIndex(): void {
    try {
      if (fs.existsSync(this.indexPath)) {
        const data = fs.readFileSync(this.indexPath, 'utf-8');
        const json = JSON.parse(data);
        this.index = MiniSearch.loadJSON<SearchDoc>(JSON.stringify(json), {
          fields: ['title', 'body', 'tags'],
          storeFields: ['title', 'tags'],
        });
      }
    } catch {
      // Index corrupt or missing — start fresh
    }
  }

  private persistIndex(): void {
    try {
      const dir = require('path').dirname(this.indexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.indexPath, JSON.stringify(this.index.toJSON()), 'utf-8');
    } catch {
      // Non-fatal — index can be rebuilt
    }
  }
}
