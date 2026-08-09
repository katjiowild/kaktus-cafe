import { db, uid } from '../db';
import type { Backup, Note, Person } from '../types';

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
        // A backup taken before Project.pinned existed restores after the
        // migration has already run, so it has to be normalised here too —
        // otherwise those projects come back with the field undefined.
        db.projects.bulkAdd(
          b.projects!.map((p) => ({ ...p, pinned: typeof p.pinned === 'boolean' ? p.pinned : false })),
        ),
        db.tasks.bulkAdd(b.tasks!),
        db.notes.bulkAdd(b.notes!),
        db.meetings.bulkAdd(b.meetings!),
        db.people.bulkAdd(b.people!),
        db.settings.bulkAdd(b.settings ?? []),
      ]);
    },
  );
}

export interface ContactImportResult {
  added: number;
  skipped: string[];
}

/**
 * Bulk contacts import (v5 §5) — on-demand and repeatable, not a sync.
 *
 * Accepts an array of Person-shaped objects (or an object wrapping one under
 * `people`/`contacts`). Only `name` is required; everything else is filled in
 * with sane defaults, so a lightly-mapped export from Notion still imports.
 * Duplicates match on name, case-insensitively, and are skipped rather than
 * overwritten — a re-import must never clobber an interaction log.
 */
export async function importContacts(text: string): Promise<ContactImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError("That file isn't valid JSON.");
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { people?: unknown }).people)
      ? (parsed as { people: unknown[] }).people
      : Array.isArray((parsed as { contacts?: unknown }).contacts)
        ? (parsed as { contacts: unknown[] }).contacts
        : null;

  if (!rows) {
    throw new ImportError('Expected a JSON array of contacts.');
  }

  const existing = await db.people.toArray();
  const taken = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  const now = new Date().toISOString();

  const toAdd: Person[] = [];
  const noteAdds: Note[] = [];
  const skipped: string[] = [];

  for (const raw of rows) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    // Guard against duplicates already in the app *and* within the file itself.
    if (taken.has(key)) {
      skipped.push(name);
      continue;
    }
    taken.add(key);

    const personId = uid('person');

    // A `log` array in the source file becomes notes linked to that person —
    // the app no longer keeps a separate interaction log.
    if (Array.isArray(r.log)) {
      for (const l of r.log as Record<string, unknown>[]) {
        const text = typeof l?.text === 'string' ? l.text.trim() : '';
        if (!text) continue;
        const at = typeof l.at === 'string' ? l.at : now;
        noteAdds.push({
          id: uid('note'),
          title: `Conversation with ${name}`,
          body: text,
          projectId: null,
          personIds: [personId],
          meetingId: null,
          date: at.slice(0, 10),
          pinned: false,
          createdAt: at,
          updatedAt: now,
        });
      }
    }

    toAdd.push({
      id: personId,
      name,
      role: typeof r.role === 'string' ? r.role : '',
      howMet: typeof r.howMet === 'string' ? r.howMet : '',
      followUp: r.followUp === true,
      followUpDate: typeof r.followUpDate === 'string' ? r.followUpDate : null,
      // Project links are ids we can't resolve from an outside file; leave empty
      // rather than inventing references that point nowhere.
      projectIds: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  if (toAdd.length) await db.people.bulkAdd(toAdd);
  if (noteAdds.length) await db.notes.bulkAdd(noteAdds);
  return { added: toAdd.length, skipped };
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
