import Dexie, { type Table } from 'dexie';
import type { Meeting, Note, Person, Project, Setting, Task } from './types';

/**
 * IndexedDB via Dexie. One table per record type — the same shape a v2 backend
 * (Supabase/SQLite) would use, so migrating is an export/import, not a rewrite.
 */
class KaktusDB extends Dexie {
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  notes!: Table<Note, string>;
  meetings!: Table<Meeting, string>;
  people!: Table<Person, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('kaktus-cafe');
    this.version(1).stores({
      projects: 'id, type, status, lastActivityDate',
      tasks: 'id, projectId, dueDate, done, archived, seriesId',
      notes: 'id, projectId, date, pinned',
      meetings: 'id, datetime, source, externalId',
      people: 'id, name, followUp',
      settings: 'key',
    });
  }
}

export const db = new KaktusDB();

export function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function isEmpty(): Promise<boolean> {
  const [p, t, n, m, pe] = await Promise.all([
    db.projects.count(),
    db.tasks.count(),
    db.notes.count(),
    db.meetings.count(),
    db.people.count(),
  ]);
  return p + t + n + m + pe === 0;
}

export async function clearAll(): Promise<void> {
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
    },
  );
}
