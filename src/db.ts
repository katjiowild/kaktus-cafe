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

    // v2 — Task.urgent (v5 §1). Backfilled so existing tasks never read
    // `undefined` where the app expects a boolean.
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table<Task>('tasks')
          .toCollection()
          .modify((t) => {
            if (typeof t.urgent !== 'boolean') t.urgent = false;
          });
      });

    // v3 — Note.personIds (v5 §2), backfilled to an empty array so every
    // consumer can map over it without a guard.
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table<Note>('notes')
          .toCollection()
          .modify((n) => {
            if (!Array.isArray(n.personIds)) n.personIds = [];
          });
      });

    // v4 — Meeting.accountId (v5 §3), indexed because sync looks meetings up by
    // account on every run.
    this.version(4)
      .stores({ meetings: 'id, datetime, source, externalId, accountId' })
      .upgrade(async (tx) => {
        await tx
          .table<Meeting>('meetings')
          .toCollection()
          .modify((m) => {
            if (m.accountId === undefined) m.accountId = null;
          });
      });

    // v5 — meeting notes become ordinary Note records linked by meetingId, so
    // they appear in the Notes list like every other note. The old free-text
    // Meeting.notes is converted here and then dropped; nothing already written
    // is lost.
    this.version(5)
      .stores({ notes: 'id, projectId, date, pinned, meetingId' })
      .upgrade(async (tx) => {
        const notes = tx.table<Note>('notes');
        const meetings = tx.table<Meeting & { notes?: string }>('meetings');
        const all = await meetings.toArray();
        const now = new Date().toISOString();

        for (const m of all) {
          const text = typeof m.notes === 'string' ? m.notes.trim() : '';
          if (text) {
            await notes.add({
              id: `note_${crypto.randomUUID().slice(0, 12)}`,
              // The meeting's own title is the most useful thing to find it by.
              title: m.title,
              body: text,
              projectId: null,
              // Carry the meeting's attendees across, so the note already shows
              // on those people's pages.
              personIds: Array.isArray(m.personIds) ? [...m.personIds] : [],
              meetingId: m.id,
              date: m.datetime ? m.datetime.slice(0, 10) : now.slice(0, 10),
              pinned: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        await meetings.toCollection().modify((m) => {
          delete (m as Meeting & { notes?: string }).notes;
        });
        await notes.toCollection().modify((n) => {
          if (n.meetingId === undefined) n.meetingId = null;
        });
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
