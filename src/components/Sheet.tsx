import { useEffect, useState, type ReactNode } from 'react';
import { C, dashedBtn, input, label, pill, primaryBtn, SERIF } from '../tokens';
import { useStore, type TemplateKey } from '../store';
import { isoDate, WEEKDAY_LETTERS } from '../lib/dates';
import type { Cadence, ProjectType, Recurrence } from '../types';
import { SPECIES, speciesOr, type PlantSpecies } from '../lib/species';
import { Checkbox, FlameIcon, LocationIcon, PinIcon, ToggleRow } from './ui';
import { Plant } from './Plant';
import { PersonPicker } from './PersonPicker';
import { Linkify } from './Linkify';
import { canWrite } from '../lib/googleAuth';

export type SheetState =
  | { type: 'task'; taskId?: string; projectId?: string | null }
  | {
      type: 'note';
      noteId?: string;
      projectId?: string | null;
      meetingId?: string | null;
      personId?: string | null;
    }
  | { type: 'project'; projectId?: string }
  | { type: 'meeting'; meetingId?: string }
  | { type: 'person'; personId?: string }
  | {
      type: 'mini';
      kind: 'milestone' | 'ptask' | 'subtask';
      ctx: string;
      title: string;
      label: string;
      placeholder: string;
      /** Editing an existing milestone rather than adding one. Milestones are
       *  the only mini kind that can be reopened; ptask and subtask both hand
       *  off to rows that own their own editing. */
      editId?: string;
      initialText?: string;
      initialDate?: string | null;
    };

export function SheetShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide: boolean;
}) {
  const wrap: React.CSSProperties = wide
    ? {
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        width: 460,
        right: 'calc(max(0px, (100% - 900px)/2))',
        left: 'auto',
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        maxWidth: 460,
        margin: '0 auto',
      };

  return (
    <div style={wrap}>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(36,43,40,.42)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: C.paper,
          borderRadius: '22px 22px 0 0',
          padding: '18px 20px 30px',
          animation: 'sbup .3s cubic-bezier(.2,.8,.2,1)',
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{ width: 38, height: 4, borderRadius: 4, background: C.line, margin: '0 auto 16px' }}
        />
        <div style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 500, marginBottom: 6 }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ children, top = 14 }: { children: ReactNode; top?: number }) {
  return <div style={{ marginTop: top }}>{children}</div>;
}

function DeleteButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        marginTop: 9,
        background: 'none',
        color: C.overdue,
        border: 'none',
        fontFamily: 'inherit',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'pointer',
        padding: 8,
      }}
    >
      {children}
    </button>
  );
}

/** Project select, shared by the task and note forms. */
function ProjectSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { projects } = useStore();
  const live = projects.filter((p) => p.status !== 'done');
  return (
    <>
      <label style={label}>Project</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={input}
      >
        <option value="">— No project —</option>
        {live.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </>
  );
}

function RepeatPicker({
  value,
  onChange,
}: {
  value: Recurrence | null;
  onChange: (r: Recurrence | null) => void;
}) {
  const kind = value?.kind ?? 'none';
  const options: { key: string; label: string }[] = [
    { key: 'none', label: 'Once' },
    { key: 'weekdays', label: 'Days' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ];
  const days = value?.kind === 'weekdays' ? value.days : [];

  return (
    <>
      <label style={label}>Repeat</label>
      <div style={{ display: 'flex', gap: 7 }}>
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => {
              if (o.key === 'none') onChange(null);
              else if (o.key === 'weekly') onChange({ kind: 'weekly' });
              else if (o.key === 'monthly') onChange({ kind: 'monthly' });
              else onChange({ kind: 'weekdays', days: days.length ? days : [new Date().getDay()] });
            }}
            style={pill(kind === o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value?.kind === 'weekdays' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {WEEKDAY_LETTERS.map((letter, i) => {
            const on = value.days.includes(i);
            return (
              <button
                key={i}
                aria-label={`Repeat on day ${i}`}
                aria-pressed={on}
                onClick={() => {
                  const next = on ? value.days.filter((d) => d !== i) : [...value.days, i];
                  onChange({ kind: 'weekdays', days: next });
                }}
                style={{
                  flex: 1,
                  aspectRatio: '1',
                  borderRadius: '50%',
                  border: `1px solid ${on ? C.sage : C.line}`,
                  background: on ? C.sage : C.card,
                  color: on ? C.paper : C.softInk,
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------------- Task ----------------

function TaskSheet({ state, onClose }: { state: SheetState & { type: 'task' }; onClose: () => void }) {
  const store = useStore();
  const existing = state.taskId ? store.tasks.find((t) => t.id === state.taskId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [projectId, setProjectId] = useState<string | null>(
    existing?.projectId ?? state.projectId ?? null,
  );
  const [dueDate, setDueDate] = useState<string>(existing?.dueDate ?? isoDate());
  const [dueTime, setDueTime] = useState<string>(existing?.dueTime ?? '');
  const [recurrence, setRecurrence] = useState<Recurrence | null>(existing?.recurrence ?? null);
  const [urgent, setUrgent] = useState<boolean>(existing?.urgent ?? false);
  const [newSub, setNewSub] = useState('');

  const save = async () => {
    const t = title.trim();
    if (!t) {
      store.showToast('Add a title first');
      return;
    }
    if (recurrence?.kind === 'weekdays' && recurrence.days.length === 0) {
      store.showToast('Pick at least one day');
      return;
    }
    if (existing) {
      await store.updateTask(existing.id, {
        title: t,
        projectId,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        recurrence,
        urgent,
      });
      store.showToast('Task updated');
    } else {
      await store.createTask({
        title: t,
        projectId,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        recurrence,
        urgent,
      });
    }
    onClose();
  };

  return (
    <>
      <Field top={12}>
        <label style={label}>What needs doing?</label>
        <input
          value={title}
          autoFocus={!existing}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Draft the brief"
          style={input}
        />
      </Field>

      <Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Due</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={input}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Time (optional)</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              style={input}
            />
          </div>
        </div>
      </Field>

      <Field>
        <ProjectSelect value={projectId} onChange={setProjectId} />
      </Field>

      <Field>
        <RepeatPicker value={recurrence} onChange={setRecurrence} />
      </Field>

      <Field top={16}>
        <ToggleRow
          icon={<FlameIcon />}
          label="Mark as urgent"
          on={urgent}
          onToggle={() => setUrgent((u) => !u)}
        />
      </Field>

      {existing && (
        <Field top={16}>
          <label style={label}>Sub-tasks</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {existing.subtasks.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 11,
                  padding: '10px 12px',
                }}
              >
                <Checkbox
                  done={s.done}
                  size={20}
                  radius={6}
                  onClick={() => void store.toggleSubtask(existing.id, s.id)}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: s.done ? C.muted : C.ink,
                    textDecoration: s.done ? 'line-through' : 'none',
                  }}
                >
                  {s.text}
                </span>
                <button
                  onClick={() => void store.removeSubtask(existing.id, s.id)}
                  aria-label="Remove sub-task"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b8b0a0',
                    fontSize: 18,
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: '0 2px',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSub.trim()) {
                    void store.addSubtask(existing.id, newSub.trim());
                    setNewSub('');
                  }
                }}
                placeholder="Add a sub-task"
                style={{ ...input, flex: 1, fontSize: 14 }}
              />
              <button
                onClick={() => {
                  if (!newSub.trim()) return;
                  void store.addSubtask(existing.id, newSub.trim());
                  setNewSub('');
                }}
                style={{
                  flexShrink: 0,
                  background: C.sage,
                  color: C.paper,
                  border: 'none',
                  borderRadius: 11,
                  padding: '0 16px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </Field>
      )}

      <button onClick={() => void save()} style={{ ...primaryBtn, marginTop: 20 }}>
        {existing ? 'Save changes' : 'Add task'}
      </button>
      {existing && (
        <DeleteButton
          onClick={() => {
            void store.deleteTask(existing.id);
            onClose();
          }}
        >
          Delete task
        </DeleteButton>
      )}
    </>
  );
}

// ---------------- Note ----------------

function NoteSheet({ state, onClose }: { state: SheetState & { type: 'note' }; onClose: () => void }) {
  const store = useStore();
  const existing = state.noteId ? store.notes.find((n) => n.id === state.noteId) : undefined;
  const meetingId = existing?.meetingId ?? state.meetingId ?? null;
  const meeting = meetingId ? store.meetings.find((m) => m.id === meetingId) : undefined;

  // A note started from a meeting inherits its attendees, and — only for the
  // first note from that meeting — its title. Prefilling every time would give
  // you a stack of identically-named notes.
  const isFirstFromMeeting =
    !!meeting && !store.notes.some((n) => n.meetingId === meeting.id);
  const [title, setTitle] = useState(
    existing?.title ?? (isFirstFromMeeting ? (meeting?.title ?? '') : ''),
  );
  const [body, setBody] = useState(existing?.body ?? '');
  const [projectId, setProjectId] = useState<string | null>(
    existing?.projectId ?? state.projectId ?? null,
  );
  const [personIds, setPersonIds] = useState<string[]>(
    existing?.personIds ?? meeting?.personIds ?? (state.personId ? [state.personId] : []),
  );

  const save = async () => {
    if (!body.trim()) {
      store.showToast('Add some content');
      return;
    }
    await store.saveNote({
      id: existing?.id,
      title: title.trim() || 'Untitled',
      body: body.trim(),
      projectId,
      personIds,
      meetingId,
    });
    onClose();
  };

  return (
    <>
      {meeting && (
        <div
          style={{
            marginTop: 10,
            padding: '9px 12px',
            background: C.paper2,
            borderRadius: 10,
            fontSize: 12,
            color: C.softInk,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: C.muted }}>◷</span>
          From <b style={{ color: C.ink }}>{meeting.title}</b>
        </div>
      )}
      <Field top={12}>
        <label style={label}>Title</label>
        <input
          value={title}
          autoFocus={!existing}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Field observation"
          style={input}
        />
      </Field>
      <Field>
        <label style={label}>Note</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Capture the thought…"
          style={{ ...input, resize: 'none', minHeight: 90 }}
        />
      </Field>
      <Field>
        <ProjectSelect value={projectId} onChange={setProjectId} />
      </Field>
      <Field>
        <PersonPicker
          selected={personIds}
          onChange={setPersonIds}
          hint="Linked notes show on each person's page."
        />
      </Field>

      {existing && (
        <div
          onClick={() => void store.toggleNotePin(existing.id)}
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <span style={{ display: 'flex' }}>
            <PinIcon pinned={existing.pinned} size={15} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: C.ink }}>Pin to top</span>
          <span
            style={{
              width: 40,
              height: 24,
              borderRadius: 12,
              background: existing.pinned ? C.sage : '#d8d0bf',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: existing.pinned ? 'flex-end' : 'flex-start',
              transition: 'all .18s ease',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,.2)',
              }}
            />
          </span>
        </div>
      )}

      <button onClick={() => void save()} style={{ ...primaryBtn, marginTop: 20 }}>
        {existing ? 'Update note' : 'Save note'}
      </button>
      {existing && (
        <DeleteButton
          onClick={() => {
            void store.deleteNote(existing.id);
            onClose();
          }}
        >
          Delete note
        </DeleteButton>
      )}
    </>
  );
}

// ---------------- Project ----------------

function ProjectSheet({
  state,
  onClose,
}: {
  state: SheetState & { type: 'project' };
  onClose: () => void;
}) {
  const store = useStore();
  const existing = state.projectId ? store.projects.find((p) => p.id === state.projectId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<ProjectType>(existing?.type ?? 'active');
  const [species, setSpecies] = useState<PlantSpecies>(speciesOr(existing?.species));
  const [template, setTemplate] = useState<TemplateKey>('blank');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? isoDate());
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [cadence, setCadence] = useState<Cadence>(existing?.cadence ?? 'weekly');
  // Project↔Person is stored on the Person side, so read the current links out.
  const [personIds, setPersonIds] = useState<string[]>(
    existing ? store.people.filter((p) => p.projectIds.includes(existing.id)).map((p) => p.id) : [],
  );

  const save = async () => {
    const n = name.trim();
    if (!n) {
      store.showToast('Add a name');
      return;
    }
    if (existing) {
      await store.updateProject(existing.id, {
        name: n,
        species,
        description,
        startDate: existing.type === 'active' ? startDate || null : null,
        endDate: existing.type === 'active' ? endDate || null : null,
        cadence: existing.type === 'retainer' ? cadence : null,
      });
      await store.setProjectPeople(existing.id, personIds);
      store.showToast('Project updated');
    } else {
      const newId = await store.createProject({
        name: n,
        type,
        species,
        template,
        description,
        startDate: type === 'active' ? startDate || null : null,
        endDate: type === 'active' ? endDate || null : null,
        cadence: type === 'retainer' ? cadence : null,
      });
      await store.setProjectPeople(newId, personIds);
      store.showToast('Project created');
    }
    onClose();
  };

  // Editing never changes type: it decides which fields this form shows, and
  // switching an active project to a retainer mid-life would strip its dates.
  // The plant is no longer attached to it, so that stays editable.
  const shownType = existing?.type ?? type;

  return (
    <>
      <Field top={12}>
        <label style={label}>Project name</label>
        <input
          value={name}
          autoFocus={!existing}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kitchen remodel"
          style={input}
        />
      </Field>

      {!existing && (
        <Field>
          <label style={label}>Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {(
              [
                ['active', 'Active', 'Start + end'],
                ['retainer', 'Retainer', 'Ongoing'],
                ['area', 'Area', 'Reference'],
              ] as const
            ).map(([v, l, sub]) => (
              <button
                key={v}
                onClick={() => {
                  setType(v);
                  setTemplate('blank');
                }}
                style={{
                  ...pill(type === v),
                  flexDirection: 'column',
                  padding: '12px 6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{l}</div>
                <div style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.8, marginTop: 3 }}>
                  {sub}
                </div>
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field>
        <label style={label}>Plant</label>
        {/* Shown at full growth: you're choosing a species, not a stage, and
            the level-1 seedlings are hard to tell apart. */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            margin: '0 -2px',
          }}
        >
          {SPECIES.map((s) => {
            const on = species === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSpecies(s.id)}
                aria-pressed={on}
                style={{
                  flexShrink: 0,
                  width: 76,
                  border: `1.5px solid ${on ? C.sage : C.line}`,
                  background: on ? C.sageBg : C.card,
                  borderRadius: 12,
                  padding: '6px 4px 7px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Plant stage={4} vitality="healthy" species={s.id} size={52} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: on ? C.sageInk : C.muted,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field>
        <label style={label}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project?"
          style={{ ...input, resize: 'none', minHeight: 64, fontSize: 14 }}
        />
      </Field>

      <Field>
        <PersonPicker
          selected={personIds}
          onChange={setPersonIds}
          label="People involved"
          hint="Shows this project on their page, and them on this project."
        />
      </Field>

      {shownType === 'active' && (
        <Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={input}
              />
            </div>
          </div>
        </Field>
      )}

      {shownType === 'retainer' && (
        <Field>
          <label style={label}>Cadence</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {(['weekly', 'monthly'] as const).map((c) => (
              <button key={c} onClick={() => setCadence(c)} style={pill(cadence === c)}>
                {c === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </Field>
      )}

      {!existing && type === 'active' && (
        <Field>
          <label style={label}>Start from a template</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {(
              [
                ['blank', 'Blank'],
                ['trip', 'Trip'],
                ['content', 'Content'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} onClick={() => setTemplate(v)} style={pill(template === v)}>
                {l}
              </button>
            ))}
          </div>
        </Field>
      )}

      {!existing && type === 'retainer' && (
        <Field>
          <label style={label}>Start from a template</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {(
              [
                ['blank', 'Blank'],
                ['upkeep', `Seed a ${cadence} check-in`],
              ] as const
            ).map(([v, l]) => (
              <button key={v} onClick={() => setTemplate(v)} style={pill(template === v)}>
                {l}
              </button>
            ))}
          </div>
        </Field>
      )}

      <button onClick={() => void save()} style={{ ...primaryBtn, marginTop: 20 }}>
        {existing ? 'Save changes' : 'Create project'}
      </button>
      {existing && (
        <DeleteButton
          onClick={() => {
            void store.deleteProject(existing.id);
            onClose();
          }}
        >
          Delete project
        </DeleteButton>
      )}
    </>
  );
}

// ---------------- Meeting ----------------

function MeetingSheet({
  state,
  onClose,
  onAddNote,
  onOpenNote,
}: {
  state: SheetState & { type: 'meeting' };
  onClose: () => void;
  onAddNote: (meetingId: string) => void;
  onOpenNote: (noteId: string) => void;
}) {
  const store = useStore();
  const existing = state.meetingId
    ? store.meetings.find((m) => m.id === state.meetingId)
    : undefined;
  const readOnly = existing?.source === 'google';

  const init = existing ? new Date(existing.datetime) : new Date();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(isoDate(init));
  const [time, setTime] = useState(
    `${String(init.getHours()).padStart(2, '0')}:${String(init.getMinutes()).padStart(2, '0')}`,
  );
  const [personIds, setPersonIds] = useState<string[]>(existing?.personIds ?? []);
  const [peopleText, setPeopleText] = useState(existing?.peopleText ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');

  // Which Google account (if any) gets a real calendar event — new meetings
  // only, since the app pushes once at create time and never syncs edits back.
  const writeAccounts = store.accounts.filter((a) => a.provider === 'google' && canWrite(a.scopes));
  const [pushTo, setPushTo] = useState<string | null>(() => {
    if (existing) return null;
    const preferred = store.defaultWriteAccountId;
    if (preferred && writeAccounts.some((a) => a.id === preferred)) return preferred;
    return writeAccounts[0]?.id ?? null;
  });

  // Notes are ordinary Note records linked to this meeting, so they also show
  // up in the Notes list and on each attendee's page.
  const linkedNotes = existing
    ? store.notes.filter((n) => n.meetingId === existing.id)
    : [];

  const notesSection = existing ? (
    <Field top={18}>
      <label style={label}>Notes</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {linkedNotes.map((n) => (
          <div
            key={n.id}
            onClick={() => onOpenNote(n.id)}
            style={{
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 12,
              padding: '12px 13px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
            <div
              style={{
                fontSize: 12.5,
                color: C.softInk,
                lineHeight: 1.45,
                marginTop: 4,
                whiteSpace: 'pre-wrap',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              <Linkify text={n.body} />
            </div>
          </div>
        ))}
        <button onClick={() => onAddNote(existing.id)} style={dashedBtn}>
          ＋ Add a note from this meeting
        </button>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
        These appear in Notes alongside everything else.
      </div>
    </Field>
  ) : (
    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 14, lineHeight: 1.5 }}>
      Save the meeting first, then you can add notes to it.
    </div>
  );

  const save = async () => {
    const t = title.trim();
    if (!t) {
      store.showToast('Add a title');
      return;
    }
    await store.saveMeeting({
      id: existing?.id,
      title: t,
      datetime: new Date(`${date}T${time || '09:00'}`).toISOString(),
      personIds,
      peopleText,
      location,
      pushTo: existing ? null : pushTo,
    });
    onClose();
  };

  if (readOnly) {
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{existing.title}</div>
        <div style={{ fontSize: 13, color: C.softInk, marginTop: 8, lineHeight: 1.6 }}>
          {new Date(existing.datetime).toLocaleString('en', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
          {existing.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <LocationIcon /> {existing.location}
            </div>
          )}
          {existing.peopleText && <div>With {existing.peopleText}</div>}
        </div>
        {/* The event is read-only, but the notes are ours — most meetings will
            be synced ones, so notes have to work here too. */}
        {notesSection}
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: C.paper2,
            borderRadius: 12,
            fontSize: 12.5,
            color: C.softInk,
            lineHeight: 1.5,
          }}
        >
          The event itself came from your calendar and syncs read-only — change the time, title or
          attendees there. Your notes stay here.
        </div>

        <DeleteButton
          onClick={() => {
            void store.deleteMeeting(existing.id);
            onClose();
          }}
        >
          Remove from app
        </DeleteButton>
        <div
          style={{
            fontSize: 11.5,
            color: C.muted,
            lineHeight: 1.5,
            textAlign: 'center',
            marginTop: -2,
          }}
        >
          Only removes it here — the event stays in your calendar, and any notes on it are kept.
          {existing.accountId ? ' A future sync may pull it back in.' : ''}
        </div>
      </div>
    );
  }

  return (
    <>
      <Field top={12}>
        <label style={label}>Title</label>
        <input
          value={title}
          autoFocus={!existing}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Design review"
          style={input}
        />
      </Field>
      <Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={input} />
          </div>
        </div>
      </Field>
      <Field>
        <PersonPicker selected={personIds} onChange={setPersonIds} label="With" />
      </Field>
      <Field>
        <label style={label}>Anyone else</label>
        <input
          value={peopleText}
          onChange={(e) => setPeopleText(e.target.value)}
          placeholder="e.g. the team"
          style={input}
        />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
          For attendees you don't keep in People.
        </div>
      </Field>
      <Field>
        <label style={label}>Location</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Zoom, or Studio B"
          style={input}
        />
      </Field>
      {!existing && writeAccounts.length > 0 && (
        <Field>
          <label style={label}>Add to calendar</label>
          <select
            value={pushTo ?? ''}
            onChange={(e) => setPushTo(e.target.value || null)}
            style={input}
          >
            {writeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
            <option value="">— Don't add —</option>
          </select>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
            Creates a real event so your phone handles the reminder. It's written once — later
            changes need making in the calendar itself.
          </div>
        </Field>
      )}

      {notesSection}
      <button onClick={() => void save()} style={{ ...primaryBtn, marginTop: 20 }}>
        {existing ? 'Update meeting' : 'Add meeting'}
      </button>
      {existing && (
        <DeleteButton
          onClick={() => {
            void store.deleteMeeting(existing.id);
            onClose();
          }}
        >
          Delete meeting
        </DeleteButton>
      )}
    </>
  );
}

// ---------------- Person ----------------

function PersonSheet({
  state,
  onClose,
}: {
  state: SheetState & { type: 'person' };
  onClose: () => void;
}) {
  const store = useStore();
  const existing = state.personId ? store.people.find((p) => p.id === state.personId) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [role, setRole] = useState(existing?.role ?? '');
  const [howMet, setHowMet] = useState(existing?.howMet ?? '');

  const save = async () => {
    const n = name.trim();
    if (!n) {
      store.showToast('Add a name');
      return;
    }
    if (existing) {
      await store.updatePerson(existing.id, { name: n, role, howMet });
      store.showToast('Person updated');
    } else {
      await store.createPerson({ name: n, role, howMet });
    }
    onClose();
  };

  return (
    <>
      <Field top={12}>
        <label style={label}>Name</label>
        <input
          value={name}
          autoFocus={!existing}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          style={input}
        />
      </Field>
      <Field>
        <label style={label}>Role / context</label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Product lead at Acme"
          style={input}
        />
      </Field>
      <Field>
        <label style={label}>How we met</label>
        <input
          value={howMet}
          onChange={(e) => setHowMet(e.target.value)}
          placeholder="e.g. Intro'd by Alex"
          style={input}
        />
      </Field>
      <button onClick={() => void save()} style={{ ...primaryBtn, marginTop: 20 }}>
        {existing ? 'Save changes' : 'Add person'}
      </button>
      {existing && (
        <DeleteButton
          onClick={() => {
            void store.deletePerson(existing.id);
            onClose();
          }}
        >
          Remove person
        </DeleteButton>
      )}
    </>
  );
}

// ---------------- Mini (single field) ----------------

function MiniSheet({ state, onClose }: { state: SheetState & { type: 'mini' }; onClose: () => void }) {
  const store = useStore();
  const [value, setValue] = useState(state.initialText ?? '');
  const [date, setDate] = useState(state.initialDate ?? '');

  const save = async () => {
    const v = value.trim();
    if (!v) {
      // Blanking the field is a cancel, not a request to erase the milestone.
      onClose();
      return;
    }
    if (state.editId) {
      await store.updateMilestone(state.ctx, state.editId, v, date || null);
      onClose();
      return;
    }
    switch (state.kind) {
      case 'milestone':
        await store.addMilestone(state.ctx, v, date || null);
        break;
      case 'ptask':
        await store.createTask({
          title: v,
          projectId: state.ctx,
          dueDate: isoDate(),
          recurrence: null,
        });
        break;
      case 'subtask':
        await store.addSubtask(state.ctx, v);
        break;
    }
    onClose();
  };

  return (
    <>
      <Field top={12}>
        <label style={label}>{state.label}</label>
        <input
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
          placeholder={state.placeholder}
          style={input}
        />
      </Field>
      {state.kind === 'milestone' && (
        <Field top={14}>
          <label style={label}>Target date (optional)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={input}
          />
        </Field>
      )}
      <button onClick={() => void save()} style={{ ...primaryBtn, marginTop: 18 }}>
        {state.editId ? 'Save changes' : 'Save'}
      </button>
      {/* The row's × is now an edit pencil, so this is the only way to remove a
          milestone — same place project delete lives. */}
      {state.editId && (
        <DeleteButton
          onClick={() => {
            void store.removeMilestone(state.ctx, state.editId!);
            onClose();
          }}
        >
          Delete milestone
        </DeleteButton>
      )}
    </>
  );
}

// ---------------- Dispatcher ----------------

const TITLES: Record<string, string> = {
  task: 'New task',
  note: 'New note',
  project: 'New project',
  meeting: 'New meeting',
  person: 'New person',
};

export function Sheet({
  state,
  onClose,
  onOpenSheet,
  wide,
}: {
  state: SheetState;
  onClose: () => void;
  onOpenSheet: (s: SheetState) => void;
  wide: boolean;
}) {
  // Escape closes, and the sheet traps the page behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  let title: string;
  if (state.type === 'mini') title = state.title;
  else if (state.type === 'task') title = state.taskId ? 'Edit task' : TITLES.task;
  else if (state.type === 'note') title = state.noteId ? 'Edit note' : TITLES.note;
  else if (state.type === 'project') title = state.projectId ? 'Edit project' : TITLES.project;
  else if (state.type === 'meeting')
    title = state.meetingId ? 'Edit meeting' : TITLES.meeting;
  else title = state.personId ? 'Edit person' : TITLES.person;

  return (
    <SheetShell title={title} onClose={onClose} wide={wide}>
      {state.type === 'task' && <TaskSheet state={state} onClose={onClose} />}
      {state.type === 'note' && <NoteSheet state={state} onClose={onClose} />}
      {state.type === 'project' && <ProjectSheet state={state} onClose={onClose} />}
      {state.type === 'meeting' && (
        <MeetingSheet
          state={state}
          onClose={onClose}
          onAddNote={(meetingId) => onOpenSheet({ type: 'note', meetingId })}
          onOpenNote={(noteId) => onOpenSheet({ type: 'note', noteId })}
        />
      )}
      {state.type === 'person' && <PersonSheet state={state} onClose={onClose} />}
      {state.type === 'mini' && <MiniSheet state={state} onClose={onClose} />}
    </SheetShell>
  );
}

export { dashedBtn };
