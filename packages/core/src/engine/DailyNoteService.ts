import { Note, DayInfo, BlockType } from '../models/types';
import { NoteRepository } from '../db/NoteRepository';

export class DailyNoteService {
  private repo: NoteRepository;

  constructor(repo: NoteRepository) {
    this.repo = repo;
  }

  /**
   * Get today's daily note, creating it if it doesn't exist.
   */
  getOrCreateToday(): Note {
    const today = this.formatDate(new Date());
    const existing = this.repo.getDailyNote(today);

    if (existing) {
      const note = this.repo.getNote(existing.noteId);
      if (note) return note;
    }

    // Create the daily note
    const title = `Daily: ${today}`;
    const note = this.repo.createNote(title);

    // Add a default heading block
    this.repo.createBlock({
      noteId: note.id,
      type: BlockType.Heading,
      content: title,
      meta: { level: 1 },
      position: 0,
      parentId: null,
    });

    this.repo.createDailyNote(today, note.id);

    return this.repo.getNote(note.id)!;
  }

  /**
   * Get the current streak (consecutive days with daily notes).
   */
  getStreak(): number {
    return this.repo.getStreak();
  }

  /**
   * Get calendar data for a given month.
   */
  getCalendarMonth(year: number, month: number): DayInfo[] {
    const days: DayInfo[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = this.formatDate(new Date(year, month - 1, d));
      const daily = this.repo.getDailyNote(date);
      days.push({ date, hasNote: !!daily });
    }

    return days;
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
