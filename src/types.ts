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
  /** Google events are read-only and badged GCAL (§4). */
  source: 'local' | 'google';
  /** Google's event id, so a re-sync updates rather than duplicates. */
  externalId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  id: string;
  /** ISO datetime. */
  at: string;
  text: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  howMet: string;
  followUp: boolean;
  /** ISO date, optional — "reconnect around then". */
  followUpDate: string | null;
  /** The interaction log is the core of this record's value (§3.6). */
  log: LogEntry[];
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Small key/value bag: dismissed nudges, Google tokens, last-seen version. */
export interface Setting {
  key: string;
  value: unknown;
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
