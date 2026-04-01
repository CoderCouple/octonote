import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from '../db/schema';
import { NoteRepository } from '../db/NoteRepository';
import { DailyNoteService } from '../engine/DailyNoteService';

describe('DailyNoteService', () => {
  let db: Database.Database;
  let repo: NoteRepository;
  let service: DailyNoteService;

  beforeEach(() => {
    db = initDatabase(':memory:');
    repo = new NoteRepository(db);
    service = new DailyNoteService(repo);
  });

  it('creates today\'s daily note', () => {
    const note = service.getOrCreateToday();
    expect(note).toBeDefined();
    expect(note.title).toMatch(/^Daily: \d{4}-\d{2}-\d{2}$/);
    expect(note.blocks!.length).toBe(1);
  });

  it('returns same note on second call', () => {
    const first = service.getOrCreateToday();
    const second = service.getOrCreateToday();
    expect(first.id).toBe(second.id);
  });

  it('calculates streak', () => {
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const note = repo.createNote(`Daily: ${dateStr}`);
      repo.createDailyNote(dateStr, note.id);
    }
    expect(service.getStreak()).toBe(3);
  });

  it('returns calendar month data', () => {
    // Create a daily note for Jan 15
    const note = repo.createNote('Daily: 2024-01-15');
    repo.createDailyNote('2024-01-15', note.id);

    const calendar = service.getCalendarMonth(2024, 1);
    expect(calendar.length).toBe(31); // January has 31 days
    expect(calendar[14].hasNote).toBe(true); // Jan 15 (0-indexed)
    expect(calendar[0].hasNote).toBe(false);
  });
});
