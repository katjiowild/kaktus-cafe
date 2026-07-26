// The v1 data model. Records are flat collections keyed by string id, so a v2
// backend (Supabase table or SQLite table per collection) is an additive port,
// not a rewrite. Owned children (milestones, comments, subtasks, log entries)
// are embedded arrays but each carries its own id, so they lift cleanly into
// child tables with a parent foreign key when that day comes.

export type ProjectType = 'active' | 'retainer' | 'area';

/** Spec §3.1. `done` projects live in the Archive; `onhold` is parked but not finished. */
export type ProjectStatus = 'active' | 'onhold' | 'done';

export type Cadence = 'weekly' | 'monthly';

export interface Milestone {
  id: string;
  text: string;
  done: boolean;
}

export interface ProjectComment {
  id: string;
  /** ISO datetime. */
  at: string;
  text: string;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string;
  /** ISO date (yyyy-mm-dd). Active projects only. */
  startDate: string | null;
  endDate: string | null;
  /** Retainer only — drives the streak dots and the seeded recurring task. */
  cadence: Cadence | null;
  /** ISO datetime. Auto-stamped by touchProject(); drives vitality + nudges (§3.1, §5.3). */
  lastActivityDate: string;
  /** ISO date, set when status becomes 'done'. */
  completedOn: string | null;
  milestones: Milestone[];
  comments: ProjectComment[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

/** Spec §3.3: none | specific weekdays | weekly | monthly. */
export type Recurrence =
  | { kind: 'weekly' }
  | { kind: 'monthly' }
  /** days: 0=Sunday … 6=Saturday. */
  | { kind: 'weekdays'; days: number[] };

export interface Task {
  id: string;
  title: string;
  /** Nullable — loose tasks are allowed and live in the flat All-tasks list (§10). */
  projectId: string | null;
  /** ISO date (yyyy-mm-dd). */
  dueDate: string | null;
  done: boolean;
  /** Floats the task to the top of every list, ahead of the due-date order (v5 §1). */
  urgent: boolean;
  /** ISO datetime, set on completion. Feeds retainer streaks. */
  completedAt: string | null;
  /** Completed instances of a recurring task are archived out of the live list. */
  archived: boolean;
  subtasks: Subtask[];
  recurrence: Recurrence | null;
  /** Shared by every instance spawned from one recurring task, so history stays linkable. */
  seriesId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  /** Notes tag to a Project, not a free-text category (§3.4). */
  projectId: string | null;
  /** Linked People — mirrors Meeting.personIds (v5 §2). */
  personIds: string[];
  /** The meeting this came out of, if any. Notes taken in a meeting are
   *  ordinary Notes: they show in the Notes list and on the meeting. */
  meetingId: string | null;
  /** ISO date. */
  date: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  /** ISO datetime. */
  datetime: string;
  /** Linked Person records, where the attendee matched someone in the CRM. */
  personIds: string[];
  /** Attendees who aren't (yet) Person records — kept as typed. */
  peopleText: string;
  location: string;
  /** Synced events are read-only and badged with their provider (§4, v5 §3–4). */
  source: 'local' | 'google' | 'outlook';
  /** The provider's event id, so a re-sync updates rather than duplicates. */
  externalId: string | null;
  /** Which connected account this came from — null for local meetings (v5 §3). */
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  howMet: string;
  followUp: boolean;
  /** ISO date, optional — "reconnect around then". */
  followUpDate: string | null;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}
// The old per-person interaction log was folded into Notes: a note linked to a
// person is the same thing, and it also shows up in Notes and can carry a
// project or meeting. One place for each thing (§1).

/** Small key/value bag: dismissed nudges, OAuth tokens, last-seen version. */
export interface Setting {
  key: string;
  value: unknown;
}

export type CalendarProvider = 'google' | 'outlook';

/**
 * One connected calendar account (v5 §3–4). Multiple accounts per provider are
 * supported — personal + work — each with its own tokens, so revoking or
 * re-authorising one never disturbs another.
 */
export interface CalendarAccount {
  id: string;
  provider: CalendarProvider;
  /** The account's own email, shown in Settings and on the meeting badge. */
  email: string;
  accessToken: string;
  /** Absolute epoch ms; refreshed quietly when past. */
  expiresAt: number;
  refreshToken: string | null;
  /** Scopes Google actually granted. Absent on pre-v6 records = read-only. */
  scopes?: string;
  /** ISO datetime of the last successful sync. */
  lastSyncedAt: string | null;
  /** Last sync failure, surfaced in Settings rather than swallowed. */
  lastError: string | null;
}

export interface Backup {
  format: 'kaktus-cafe';
  version: 1;
  exportedAt: string;
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  meetings: Meeting[];
  people: Person[];
  settings: Setting[];
}
