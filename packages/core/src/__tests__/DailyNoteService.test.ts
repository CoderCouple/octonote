import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import { initDatabase } from '../db/schema';
import { NoteRepository } from '../db/NoteRepository';
import { DailyNoteService } from '../engine/DailyNoteService';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/octonote_test';

describe('DailyNoteService', () => {
  let pool: Pool;
  let repo: NoteRepository;
  let service: DailyNoteService;

  beforeEach(async () => {
    pool = await initDatabase(TEST_DATABASE_URL);
    await pool.query('DELETE FROM daily_notes');
    await pool.query('DELETE FROM links');
    await pool.query('DELETE FROM note_tags');
    await pool.query('DELETE FROM blocks');
    await pool.query('DELETE FROM notes');
    await pool.query('DELETE FROM tags');
    await pool.query('DELETE FROM folders');
    repo = new NoteRepository(pool);
    service = new DailyNoteService(repo);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('creates today\'s daily note', async () => {
    const note = await service.getOrCreateToday();
    expect(note).toBeDefined();
    expect(note.title).toMatch(/^Daily: \d{4}-\d{2}-\d{2}$/);
    expect(note.blocks!.length).toBe(1);
  });

  it('returns same note on second call', async () => {
    const first = await service.getOrCreateToday();
    const second = await service.getOrCreateToday();
    expect(first.id).toBe(second.id);
  });

  it('calculates streak', async () => {
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const note = await repo.createNote(`Daily: ${dateStr}`);
      await repo.createDailyNote(dateStr, note.id);
    }
    expect(await service.getStreak()).toBe(3);
  });

  it('returns calendar month data', async () => {
    // Create a daily note for Jan 15
    const note = await repo.createNote('Daily: 2024-01-15');
    await repo.createDailyNote('2024-01-15', note.id);

    const calendar = await service.getCalendarMonth(2024, 1);
    expect(calendar.length).toBe(31); // January has 31 days
    expect(calendar[14].hasNote).toBe(true); // Jan 15 (0-indexed)
    expect(calendar[0].hasNote).toBe(false);
  });
});
