import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Flame,
  FileText,
} from 'lucide-react';
import type { Note } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAILY_TITLE_PATTERN = /^Daily:\s*(\d{4}-\d{2}-\d{2})$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyPage() {
  const navigate = useNavigate();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // Fetch all notes and filter daily ones
  useEffect(() => {
    setLoading(true);
    api.notes
      .list()
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Map of date key -> note id for daily notes
  const dailyNoteMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of notes) {
      const match = DAILY_TITLE_PATTERN.exec(note.title);
      if (match) {
        map.set(match[1], note.id);
      }
    }
    return map;
  }, [notes]);

  // Calculate streak
  const streak = useMemo(() => {
    let count = 0;
    const d = new Date(today);
    // Check today first
    const todayHasNote = dailyNoteMap.has(todayKey);
    if (!todayHasNote) {
      // Check if yesterday has a note to count streak from yesterday
      d.setDate(d.getDate() - 1);
    }
    while (true) {
      const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (dailyNoteMap.has(key)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [dailyNoteMap, todayKey]);

  // Calendar grid data
  const { firstDay, daysInMonth } = useMemo(
    () => getMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number | null; dateKey: string | null }> = [];
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, dateKey: null });
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        dateKey: formatDateKey(viewYear, viewMonth, d),
      });
    }
    return days;
  }, [firstDay, daysInMonth, viewYear, viewMonth]);

  // Today's note
  const todayNoteId = dailyNoteMap.get(todayKey) ?? null;

  // Handlers
  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleDayClick = useCallback(
    async (dateKey: string) => {
      // If note exists for this day, navigate to it
      const existingId = dailyNoteMap.get(dateKey);
      if (existingId) {
        navigate(`/notes/${existingId}`);
        return;
      }

      // Create a new daily note
      setCreating(dateKey);
      try {
        const note = await api.notes.create({ title: `Daily: ${dateKey}` });
        setNotes((prev) => [note, ...prev]);
        navigate(`/notes/${note.id}`);
      } catch {
        // Silently fail
      } finally {
        setCreating(null);
      }
    },
    [dailyNoteMap, navigate],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-[320px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Calendar className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Daily Notes</h1>
      </div>

      {/* Streak counter */}
      {streak > 0 && (
        <Card className="mb-6">
          <CardContent className="flex items-center gap-3 p-4">
            <Flame className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-sm font-medium">
                {streak} day streak
              </p>
              <p className="text-xs text-muted-foreground">
                Keep it going!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">
              {getMonthLabel(viewYear, viewMonth)}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => {
              if (cell.day === null) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const isToday = cell.dateKey === todayKey;
              const hasNote = cell.dateKey ? dailyNoteMap.has(cell.dateKey) : false;
              const isCreatingThis = cell.dateKey === creating;

              return (
                <Button
                  key={cell.dateKey}
                  variant="ghost"
                  size="sm"
                  disabled={isCreatingThis}
                  onClick={() => cell.dateKey && handleDayClick(cell.dateKey)}
                  className={cn(
                    'aspect-square h-auto w-full p-0 text-sm relative',
                    isToday &&
                      'ring-2 ring-primary ring-offset-1 ring-offset-background font-bold',
                    hasNote && 'bg-primary/10 text-primary font-medium',
                  )}
                >
                  {cell.day}
                  {hasNote && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Today's note link */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Today</h2>
        {todayNoteId ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate(`/notes/${todayNoteId}`)}
          >
            <FileText className="h-4 w-4" />
            Open today&apos;s note
            <Badge variant="secondary" className="ml-auto text-xs">
              {todayKey}
            </Badge>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleDayClick(todayKey)}
            disabled={creating === todayKey}
          >
            <FileText className="h-4 w-4" />
            {creating === todayKey
              ? 'Creating...'
              : "Create today's note"}
            <Badge variant="secondary" className="ml-auto text-xs">
              {todayKey}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
}
