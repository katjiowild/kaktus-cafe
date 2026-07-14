import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { db, getSetting, setSetting, uid } from './db';
import { isoDate, isoNow, nextOccurrence, parseDate, today } from './lib/dates';
import type {
  Cadence,
  Meeting,
  Note,
  Person,
  Project,
  ProjectType,
  Recurrence,
  Subtask,
  Task,
} from './types';

interface Data {
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  meetings: Meeting[];
  people: Person[];
  dismissed: string[];
}

const EMPTY: Data = {
  projects: [],
  tasks: [],
  notes: [],
  meetings: [],
  people: [],
  dismissed: [],
};

export interface Store extends Data {
  ready: boolean;
  toast: string;
  showToast: (msg: string) => void;
  reload: () => Promise<void>;

  createProject: (input: {
    name: string;
    type: ProjectType;
    template: TemplateKey;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    cadence?: Cadence | null;
  }) => Promise<string>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  completeProject: (id: string) => Promise<void>;
  reopenProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addMilestone: (projectId: string, text: string) => Promise<void>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  removeMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  moveMilestone: (projectId: string, milestoneId: string, dir: -1 | 1) => Promise<void>;
  addComment: (projectId: string, text: string) => Promise<void>;

  createTask: (input: {
    title: string;
    projectId: string | null;
    dueDate: string | null;
    recurrence: Recurrence | null;
  }) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addSubtask: (taskId: string, text: string) => Promise<void>;
  toggleSubtask: (taskId: string, subId: string) => Promise<void>;
  removeSubtask: (taskId: string, subId: string) => Promise<void>;

  saveNote: (input: {
    id?: string;
    title: string;
    body: string;
    projectId: string | null;
  }) => Promise<void>;
  toggleNotePin: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  saveMeeting: (input: {
    id?: string;
    title: string;
    datetime: string;
    peopleText: string;
    location: string;
  }) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;

  createPerson: (input: { name: string; role: string; howMet: string }) => Promise<void>;
  updatePerson: (id: string, patch: Partial<Person>) => Promise<void>;
  addLogEntry: (personId: string, text: string) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;

  dismissNudge: (projectId: string) => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export type TemplateKey = 'blank' | 'trip' | 'content' | 'upkeep';

/** §3.2 — starting points, fully editable after creation. */
export const TEMPLATES: Record<Exclude<TemplateKey, 'blank'>, string[]> = {
  trip: [
    'Book flights',
    'Book accommodation',
    'Travel insurance',
    'Itinerary / route',
    'Packing list',
    'Local transport',
    'Offline maps / docs',
  ],
  content: [
    'Concept / outline',
    'Shoot or source material',
    'First draft',
    'Edit / revise',
    'Visuals / assets',
    'Schedule / publish',
    'Post-publish follow-up',
  ],
  upkeep: [],
};

const ENCOURAGEMENTS = [
  'Nice work!',
  'Boom — one down!',
  'Look at you go!',
  'Done and dusted!',
  'Yes! Another win',
  'Keep that momentum!',
  'Your garden thanks you! 🌱',
  'Crushing it!',
  'On a roll! 🌵',
  'Love that energy!',
];

function encourage(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 2200);
  }, []);

  const reload = useCallback(async () => {
    const [projects, tasks, notes, meetings, people, dismissed] = await Promise.all([
      db.projects.toArray(),
      db.tasks.toArray(),
      db.notes.toArray(),
      db.meetings.toArray(),
      db.people.toArray(),
      getSetting<string[]>('dismissedNudges', []),
    ]);
    setData({ projects, tasks, notes, meetings, people, dismissed });
  }, []);

  useEffect(() => {
    void (async () => {
      await reload();
      setReady(true);
    })();
  }, [reload]);

  /**
   * Stamp a project as touched. Any completed task, new note, milestone change
   * or comment counts as care (§5.2) — this is what revives the plant and
   * clears the nudge.
   */
  const touchProject = useCallback(async (projectId: string | null) => {
    if (!projectId) return;
    const p = await db.projects.get(projectId);
    if (!p) return;
    await db.projects.update(projectId, { lastActivityDate: isoNow(), updatedAt: isoNow() });
    // Re-engaging clears the nudge, keeping banner and plant consistent (§5.3).
    const dismissed = await getSetting<string[]>('dismissedNudges', []);
    if (dismissed.includes(projectId)) {
      await setSetting(
        'dismissedNudges',
        dismissed.filter((id) => id !== projectId),
      );
    }
  }, []);

  const store: Store = useMemo(() => {
    const after = async () => reload();

    return {
      ...data,
      ready,
      toast,
      showToast,
      reload,

      // ---------- Projects ----------
      async createProject({ name, type, template, description, startDate, endDate, cadence }) {
        const id = uid('proj');
        const now = isoNow();
        const milestones =
          type === 'active' && template !== 'blank' && template !== 'upkeep'
            ? TEMPLATES[template].map((text) => ({ id: uid('ms'), text, done: false }))
            : [];
        const project: Project = {
          id,
          name,
          type,
          status: 'active',
          description: description ?? '',
          startDate: type === 'active' ? (startDate ?? isoDate()) : null,
          endDate: type === 'active' ? (endDate ?? null) : null,
          cadence: type === 'retainer' ? (cadence ?? 'weekly') : null,
          lastActivityDate: now,
          completedOn: null,
          milestones,
          comments: [],
          createdAt: now,
          updatedAt: now,
        };
        await db.projects.add(project);

        // Retainer template: one recurring seed task matching its cadence
        // (design's resolution of spec §10).
        if (type === 'retainer' && template === 'upkeep') {
          const cad: Cadence = cadence ?? 'weekly';
          await db.tasks.add({
            id: uid('task'),
            title: cad === 'weekly' ? 'Weekly check-in' : 'Monthly check-in',
            projectId: id,
            dueDate: isoDate(),
            done: false,
            completedAt: null,
            archived: false,
            subtasks: [],
            recurrence: { kind: cad === 'weekly' ? 'weekly' : 'monthly' },
            seriesId: uid('series'),
            createdAt: now,
            updatedAt: now,
          });
        }
        await after();
        return id;
      },

      async updateProject(id, patch) {
        await db.projects.update(id, { ...patch, updatedAt: isoNow() });
        await after();
      },

      async completeProject(id) {
        await db.projects.update(id, {
          status: 'done',
          completedOn: isoDate(),
          updatedAt: isoNow(),
        });
        await after();
        showToast('Completed — moved to Archive');
      },

      async reopenProject(id) {
        await db.projects.update(id, {
          status: 'active',
          completedOn: null,
          lastActivityDate: isoNow(),
          updatedAt: isoNow(),
        });
        await after();
        showToast('Back in your garden');
      },

      async deleteProject(id) {
        // Orphan rather than cascade-delete: losing a project shouldn't silently
        // take your notes and tasks with it.
        await db.transaction('rw', [db.projects, db.tasks, db.notes], async () => {
          await db.projects.delete(id);
          const ts = await db.tasks.where('projectId').equals(id).toArray();
          await Promise.all(
            ts.map((t) => db.tasks.update(t.id, { projectId: null, updatedAt: isoNow() })),
          );
          const ns = await db.notes.where('projectId').equals(id).toArray();
          await Promise.all(
            ns.map((n) => db.notes.update(n.id, { projectId: null, updatedAt: isoNow() })),
          );
        });
        await after();
        showToast('Project deleted — its tasks and notes were kept');
      },

      async addMilestone(projectId, text) {
        const p = await db.projects.get(projectId);
        if (!p) return;
        await db.projects.update(projectId, {
          milestones: [...p.milestones, { id: uid('ms'), text, done: false }],
        });
        await touchProject(projectId);
        await after();
      },

      async toggleMilestone(projectId, milestoneId) {
        const p = await db.projects.get(projectId);
        if (!p) return;
        let becameDone = false;
        const milestones = p.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          if (!m.done) becameDone = true;
          return { ...m, done: !m.done };
        });
        await db.projects.update(projectId, { milestones });
        await touchProject(projectId);
        await after();
        if (becameDone) showToast(encourage());
      },

      async removeMilestone(projectId, milestoneId) {
        const p = await db.projects.get(projectId);
        if (!p) return;
        await db.projects.update(projectId, {
          milestones: p.milestones.filter((m) => m.id !== milestoneId),
        });
        await after();
      },

      async moveMilestone(projectId, milestoneId, dir) {
        const p = await db.projects.get(projectId);
        if (!p) return;
        const list = [...p.milestones];
        const i = list.findIndex((m) => m.id === milestoneId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        await db.projects.update(projectId, { milestones: list });
        await after();
      },

      async addComment(projectId, text) {
        const p = await db.projects.get(projectId);
        if (!p) return;
        await db.projects.update(projectId, {
          comments: [{ id: uid('c'), at: isoNow(), text }, ...p.comments],
        });
        await touchProject(projectId);
        await after();
        showToast('Saved');
      },

      // ---------- Tasks ----------
      async createTask({ title, projectId, dueDate, recurrence }) {
        const now = isoNow();
        await db.tasks.add({
          id: uid('task'),
          title,
          projectId,
          dueDate,
          done: false,
          completedAt: null,
          archived: false,
          subtasks: [],
          recurrence,
          seriesId: recurrence ? uid('series') : null,
          createdAt: now,
          updatedAt: now,
        });
        await touchProject(projectId);
        await after();
        showToast('Task added');
      },

      async updateTask(id, patch) {
        await db.tasks.update(id, { ...patch, updatedAt: isoNow() });
        await after();
      },

      /**
       * §3.3 — the recurrence fix. Completing a recurring task archives the
       * completed instance and spawns the next one on the next applicable date,
       * so it reappears live rather than vanishing.
       */
      async toggleTask(id) {
        const t = await db.tasks.get(id);
        if (!t) return;

        if (t.done) {
          // Un-checking: just reopen it. (A spawned next instance, if any, is
          // left alone — deleting it could destroy edits made to it.)
          await db.tasks.update(id, { done: false, completedAt: null, updatedAt: isoNow() });
          await after();
          return;
        }

        const now = isoNow();
        const isRecurring = t.recurrence !== null;
        await db.tasks.update(id, {
          done: true,
          completedAt: now,
          archived: isRecurring,
          updatedAt: now,
        });

        if (isRecurring && t.recurrence) {
          const base = t.dueDate ? parseDate(t.dueDate) : today();
          const next = nextOccurrence(t.recurrence, base);
          if (next) {
            await db.tasks.add({
              id: uid('task'),
              title: t.title,
              projectId: t.projectId,
              dueDate: isoDate(next),
              done: false,
              completedAt: null,
              archived: false,
              // Subtasks come back unchecked — they're the steps of the chore.
              subtasks: t.subtasks.map((s) => ({ ...s, id: uid('sub'), done: false })),
              recurrence: t.recurrence,
              seriesId: t.seriesId ?? uid('series'),
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        await touchProject(t.projectId);
        await after();
        showToast(isRecurring ? 'Done — next occurrence scheduled' : encourage());
      },

      async deleteTask(id) {
        await db.tasks.delete(id);
        await after();
        showToast('Task deleted');
      },

      async addSubtask(taskId, text) {
        const t = await db.tasks.get(taskId);
        if (!t) return;
        const subtasks: Subtask[] = [...t.subtasks, { id: uid('sub'), text, done: false }];
        await db.tasks.update(taskId, { subtasks, updatedAt: isoNow() });
        await after();
      },

      async toggleSubtask(taskId, subId) {
        const t = await db.tasks.get(taskId);
        if (!t) return;
        let becameDone = false;
        const subtasks = t.subtasks.map((s) => {
          if (s.id !== subId) return s;
          if (!s.done) becameDone = true;
          return { ...s, done: !s.done };
        });
        await db.tasks.update(taskId, { subtasks, updatedAt: isoNow() });
        await touchProject(t.projectId);
        await after();
        if (becameDone) showToast(encourage());
      },

      async removeSubtask(taskId, subId) {
        const t = await db.tasks.get(taskId);
        if (!t) return;
        await db.tasks.update(taskId, {
          subtasks: t.subtasks.filter((s) => s.id !== subId),
          updatedAt: isoNow(),
        });
        await after();
      },

      // ---------- Notes ----------
      async saveNote({ id, title, body, projectId }) {
        const now = isoNow();
        if (id) {
          await db.notes.update(id, { title, body, projectId, updatedAt: now });
        } else {
          await db.notes.add({
            id: uid('note'),
            title,
            body,
            projectId,
            date: isoDate(),
            pinned: false,
            createdAt: now,
            updatedAt: now,
          });
        }
        await touchProject(projectId);
        await after();
        showToast(id ? 'Note updated' : 'Note saved');
      },

      async toggleNotePin(id) {
        const n = await db.notes.get(id);
        if (!n) return;
        await db.notes.update(id, { pinned: !n.pinned, updatedAt: isoNow() });
        await after();
      },

      async deleteNote(id) {
        await db.notes.delete(id);
        await after();
        showToast('Note deleted');
      },

      // ---------- Meetings ----------
      async saveMeeting({ id, title, datetime, peopleText, location }) {
        const now = isoNow();
        // Link attendees to Person records where the name matches — the spec
        // wants relationships, but typing a name shouldn't be blocked on the
        // person existing in the CRM first.
        const people = await db.people.toArray();
        const names = peopleText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const personIds = names
          .map((n) => people.find((p) => p.name.toLowerCase() === n.toLowerCase())?.id)
          .filter((x): x is string => Boolean(x));

        if (id) {
          await db.meetings.update(id, {
            title,
            datetime,
            peopleText,
            personIds,
            location,
            updatedAt: now,
          });
        } else {
          await db.meetings.add({
            id: uid('mtg'),
            title,
            datetime,
            personIds,
            peopleText,
            location,
            source: 'local',
            externalId: null,
            notes: '',
            createdAt: now,
            updatedAt: now,
          });
        }
        await after();
        showToast(id ? 'Meeting updated' : 'Meeting added');
      },

      async deleteMeeting(id) {
        await db.meetings.delete(id);
        await after();
        showToast('Meeting deleted');
      },

      // ---------- People ----------
      async createPerson({ name, role, howMet }) {
        const now = isoNow();
        await db.people.add({
          id: uid('person'),
          name,
          role,
          howMet,
          followUp: false,
          followUpDate: null,
          log: [],
          projectIds: [],
          createdAt: now,
          updatedAt: now,
        });
        await after();
        showToast('Person added');
      },

      async updatePerson(id, patch) {
        await db.people.update(id, { ...patch, updatedAt: isoNow() });
        await after();
      },

      async addLogEntry(personId, text) {
        const p = await db.people.get(personId);
        if (!p) return;
        await db.people.update(personId, {
          log: [{ id: uid('log'), at: isoNow(), text }, ...p.log],
          updatedAt: isoNow(),
        });
        await after();
        showToast('Logged');
      },

      async deletePerson(id) {
        await db.people.delete(id);
        await after();
        showToast('Person removed');
      },

      // ---------- Nudges ----------
      async dismissNudge(projectId) {
        const dismissed = await getSetting<string[]>('dismissedNudges', []);
        if (!dismissed.includes(projectId)) {
          await setSetting('dismissedNudges', [...dismissed, projectId]);
        }
        await after();
      },
    };
  }, [data, ready, toast, showToast, reload, touchProject]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
