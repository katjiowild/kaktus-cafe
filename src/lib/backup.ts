import { db } from '../db';
import type { Backup } from '../types';

/**
 * v1 has no server, so this file is the only other copy of the data. It's also
 * the hand-off format for Claude's advisory mode (§6, modes 1–2) — plain JSON,
 * every relationship expressed as an id, so it can be pasted into a conversation
 * and reasoned about directly.
 */
export async function exportBackup(): Promise<Backup> {
  const [projects, tasks, notes, meetings, people, settings] = await Promise.all([
    db.projects.toArray(),
    db.tasks.toArray(),
    db.notes.toArray(),
    db.meetings.toArray(),
    db.people.toArray(),
    db.settings.toArray(),
  ]);
  return {
    format: 'kaktus-cafe',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
    tasks,
    notes,
    meetings,
    people,
    settings,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kaktus-cafe-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export class ImportError extends Error {}

/**
 * Replaces everything. Validated before it touches the database — a truncated or
 * wrong-shaped file must fail loudly rather than half-wipe the only copy.
 */
export async function importBackup(text: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError("That file isn't valid JSON.");
  }

  const b = parsed as Partial<Backup>;
  if (b.format !== 'kaktus-cafe') {
    throw new ImportError("That doesn't look like a Kaktus Cafe backup.");
  }
  const collections = ['projects', 'tasks', 'notes', 'meetings', 'people'] as const;
  for (const key of collections) {
    if (!Array.isArray(b[key])) {
      throw new ImportError(`The backup is missing its "${key}".`);
    }
  }

  await db.transaction(
    'rw',
    [db.projects, db.tasks, db.notes, db.meetings, db.people, db.settings],
    async () => {
      await Promise.all([
        db.projects.clear(),
        db.tasks.clear(),
        db.notes.clear(),
        db.meetings.clear(),
        db.people.clear(),
        db.settings.clear(),
      ]);
      await Promise.all([
        db.projects.bulkAdd(b.projects!),
        db.tasks.bulkAdd(b.tasks!),
        db.notes.bulkAdd(b.notes!),
        db.meetings.bulkAdd(b.meetings!),
        db.people.bulkAdd(b.people!),
        db.settings.bulkAdd(b.settings ?? []),
      ]);
    },
  );
}

/** Counts for the settings screen, so "what am I about to back up" is legible. */
export async function dataSummary(): Promise<Record<string, number>> {
  const [projects, tasks, notes, meetings, people] = await Promise.all([
    db.projects.count(),
    db.tasks.count(),
    db.notes.count(),
    db.meetings.count(),
    db.people.count(),
  ]);
  return { projects, tasks, notes, meetings, people };
}
