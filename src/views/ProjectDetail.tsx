import { useState } from 'react';
import { C, dashedBtn, SERIF, TYPE } from '../tokens';
import { useStore } from '../store';
import { projectMeta } from '../lib/derive';
import { shortDate } from '../lib/dates';
import { Plant } from '../components/Plant';
import { TaskRow } from '../components/TaskRow';
import { PersonPicker } from '../components/PersonPicker';
import { Avatar, EmptyState, NavIcon, PencilIcon, TypeBadge } from '../components/ui';
import type { ProjectStatus } from '../types';
import type { ViewProps } from './types';
import { Linkify } from '../components/Linkify';

type Tab = 'overview' | 'tasks' | 'notes' | 'people';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'people', label: 'People' },
];

/**
 * The pill under the project name reports *status*, not type. On hold and done
 * are given in the brief; active isn't, so it takes the sage tint the mockup
 * shows. Type (Retainer/Area) rides alongside only when it isn't the plain
 * active case, so a normal project doesn't read "ACTIVE ACTIVE".
 */
const STATUS_PILL: Record<ProjectStatus, { label: string; background: string; color: string }> = {
  active: { label: 'ACTIVE', background: '#e3ecdf', color: '#4a6b52' },
  onhold: { label: 'ON HOLD', background: C.paper2, color: '#7a7263' },
  done: { label: 'DONE', background: '#e3ecdf', color: '#4a6b52' },
};

function StatusPill({ status }: { status: ProjectStatus }) {
  const s = STATUS_PILL[status];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.05em',
        padding: '3px 8px',
        borderRadius: 6,
        background: s.background,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function TabHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, margin: '18px 0 8px' }}>
      {children}
    </div>
  );
}

export function ProjectDetail({ wide, activeProjectId, openSheet, openPerson }: ViewProps) {
  const store = useStore();
  const { projects, tasks, notes, people, dismissed } = store;
  const [tab, setTab] = useState<Tab>('overview');
  const project = projects.find((p) => p.id === activeProjectId);

  if (!project) {
    return (
      <div
        style={{
          flex: '1 1 60%',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 340,
          color: C.muted,
          fontSize: 14,
          border: `1px dashed ${C.line}`,
          borderRadius: 16,
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        Select a project to open it here
      </div>
    );
  }

  const m = projectMeta(project, tasks, notes, dismissed);
  // Everything below is read live off the relationships — no maintained lists.
  const projectTasks = tasks.filter((t) => t.projectId === project.id && !t.archived);
  const projectNotes = notes.filter((n) => n.projectId === project.id);
  const projectPeople = people.filter((p) => p.projectIds.includes(project.id));

  // Retainers keep cadence and streak where a bar would go: their tasks recur
  // forever, so "3 of 4 done" would say nothing about how the upkeep is going.
  const showBar = project.type !== 'retainer' && m.total > 0;

  const dateRange =
    project.status === 'done' && project.completedOn
      ? `Completed ${new Date(project.completedOn).toLocaleDateString('en', {
          month: 'short',
          year: 'numeric',
        })}`
      : project.startDate || project.endDate
        ? `${project.startDate ? shortDate(project.startDate) : '—'} – ${
            project.endDate ? shortDate(project.endDate) : '—'
          }`
        : '';

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        ...(wide ? { flex: '1 1 60%', minWidth: 0 } : {}),
      }}
    >
      {/* Neglect banner — the same 7-day signal as the Today nudge and the
          wilted plant, said in words. */}
      {m.needsWater && project.status === 'active' && (
        <div
          style={{
            background: C.nudgeBg,
            border: `1px solid ${C.nudgeBorder}`,
            borderRadius: 12,
            padding: '11px 13px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#7a5f1a',
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0, color: '#7a5f1a' }}>
            <NavIcon name="flag" size={16} />
          </span>
          Hasn't been touched in {m.daysSinceActivity} days — could use some water.
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: C.paper2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Plant stage={m.stage} vitality={m.vitality} species={project.type} size={56} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: TYPE.projectName, fontWeight: 600, lineHeight: 1.15 }}>
            {project.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <StatusPill status={project.status} />
            {project.type !== 'active' && <TypeBadge type={project.type} />}
          </div>
        </div>
        <button
          onClick={() => void store.toggleProjectPin(project.id)}
          aria-pressed={project.pinned}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            borderRadius: 20,
            padding: '7px 12px',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            background: project.pinned ? C.deepSage : 'transparent',
            color: project.pinned ? '#fff' : C.nudgeInk,
            border: project.pinned ? '1px solid transparent' : `1px solid ${C.nudgeBorder}`,
          }}
        >
          <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
            {project.pinned ? '★' : '☆'}
          </span>
          {project.pinned ? 'In Garden' : 'Pin to Garden'}
        </button>
      </div>

      {/* Progress — or, for a retainer, the cadence it's actually judged on. */}
      {showBar && (
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 6, background: C.paper2, borderRadius: 6, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${m.pct}%`,
                borderRadius: 6,
                background: `linear-gradient(90deg, ${C.deepSage}, ${C.gold})`,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              marginTop: 7,
              fontSize: 12.5,
              color: C.softInk,
            }}
          >
            <span>
              {m.done} of {m.total} tasks · {m.pct}%
            </span>
            <span style={{ textAlign: 'right' }}>{dateRange}</span>
          </div>
        </div>
      )}
      {project.type === 'retainer' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            marginTop: 14,
            fontSize: 12.5,
            color: C.softInk,
          }}
        >
          <span>
            ↻ {project.cadence === 'monthly' ? 'Monthly' : 'Weekly'} · {m.streak}{' '}
            {project.cadence === 'monthly' ? 'months' : 'weeks'} running
          </span>
        </div>
      )}
      {!showBar && project.type !== 'retainer' && dateRange && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: C.softInk }}>{dateRange}</div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 22,
          marginTop: 18,
          borderBottom: `1px solid ${C.cardBorder}`,
        }}
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={on ? 'page' : undefined}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${on ? C.deepSage : 'transparent'}`,
                padding: '0 0 9px',
                marginBottom: -1,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                color: on ? C.ink : C.muted,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <TabHeading>About this project</TabHeading>
            {/* The brief has no edit affordance and flags it as an open
                question. The app already had one, so it stays — moved here,
                out of the pin button's corner. */}
            <button
              onClick={() => openSheet({ type: 'project', projectId: project.id })}
              aria-label="Edit project"
              title="Edit project"
              style={{
                background: 'none',
                border: 'none',
                padding: 5,
                cursor: 'pointer',
                display: 'flex',
                lineHeight: 0,
              }}
            >
              <PencilIcon />
            </button>
          </div>
          <div style={{ fontSize: 13.5, color: C.softInk, lineHeight: 1.55 }}>
            {project.description.trim() ? (
              <Linkify text={project.description} />
            ) : (
              'Add a description…'
            )}
          </div>

          {/* Areas are reference homes, not work — they have no milestones. */}
          {project.type !== 'area' && (
            <>
              <TabHeading>Milestones</TabHeading>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {project.milestones.map((ms, i) => (
                  <div
                    key={ms.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      padding: '10px 0',
                      borderBottom:
                        i === project.milestones.length - 1 ? 'none' : `1px solid ${C.paper2}`,
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        flexShrink: 0,
                        color: ms.done ? C.sage : C.faint,
                      }}
                    >
                      <NavIcon name="flag" size={18} />
                    </span>
                    {/* The brief has milestones display-only; the app has
                        always let you tick them, so tapping still toggles. */}
                    <button
                      onClick={() => void store.toggleMilestone(project.id, ms.id)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: ms.done ? C.muted : C.ink,
                        textDecoration: ms.done ? 'line-through' : 'none',
                      }}
                    >
                      {ms.text}
                    </button>
                    {ms.done && (
                      <span style={{ display: 'flex', flexShrink: 0, color: C.sage }}>
                        <svg
                          width={15}
                          height={15}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                    <button
                      onClick={() => void store.moveMilestone(project.id, ms.id, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: i === 0 ? '#ded7c6' : C.muted,
                        cursor: i === 0 ? 'default' : 'pointer',
                        padding: '0 3px',
                        fontSize: 13,
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => void store.moveMilestone(project.id, ms.id, 1)}
                      disabled={i === project.milestones.length - 1}
                      aria-label="Move down"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: i === project.milestones.length - 1 ? '#ded7c6' : C.muted,
                        cursor: i === project.milestones.length - 1 ? 'default' : 'pointer',
                        padding: '0 3px',
                        fontSize: 13,
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => void store.removeMilestone(project.id, ms.id)}
                      aria-label="Remove milestone"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.faint,
                        cursor: 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: '0 2px',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    openSheet({
                      type: 'mini',
                      kind: 'milestone',
                      ctx: project.id,
                      title: 'New milestone',
                      label: 'Milestone',
                      placeholder: 'e.g. Final review',
                    })
                  }
                  style={{ ...dashedBtn, marginTop: 10 }}
                >
                  ＋ Add milestone
                </button>
              </div>
            </>
          )}

          <TabHeading>Notes to self</TabHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {project.comments.map((c) => (
              <div
                key={c.id}
                style={{ background: '#efe9dc', borderRadius: 12, padding: '12px 13px' }}
              >
                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
                  <Linkify text={c.text} />
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginTop: 6 }}>
                  {shortDate(c.at)}
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                openSheet({
                  type: 'mini',
                  kind: 'comment',
                  ctx: project.id,
                  title: 'Note to self',
                  label: 'Note to self',
                  placeholder: 'Jot a thought about this project',
                })
              }
              style={dashedBtn}
            >
              ＋ Add a comment
            </button>
          </div>

          {/* CTA row — status changes only. Delete still lives in the edit
              sheet, where it already was. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
            {project.status === 'active' && (
              <>
                <button
                  onClick={() => void store.completeProject(project.id)}
                  style={{
                    width: '100%',
                    background: C.deepSage,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 13,
                    padding: '15px 14px',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Mark Project Completed
                </button>
                <button
                  onClick={() => void store.holdProject(project.id)}
                  style={{
                    width: '100%',
                    background: C.nudgeBg,
                    color: C.nudgeInk,
                    border: 'none',
                    borderRadius: 13,
                    padding: '14px',
                    fontFamily: 'inherit',
                    fontSize: 14.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Put on Hold
                </button>
              </>
            )}
            {project.status === 'onhold' && (
              <button
                onClick={() => void store.resumeProject(project.id)}
                style={{
                  width: '100%',
                  background: C.sage,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 13,
                  padding: '15px 14px',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Resume Project
              </button>
            )}
            {/* Done deliberately has no CTA in the brief. Restoring one stays
                possible from the Archive, which is where completed projects
                are managed. */}
          </div>
        </>
      )}

      {tab === 'tasks' && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projectTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              compact
              showSubtasks={false}
              onOpen={() => openSheet({ type: 'task', taskId: t.id })}
            />
          ))}
          {projectTasks.length === 0 && <EmptyState>No tasks yet.</EmptyState>}
          <button
            onClick={() =>
              openSheet({
                type: 'mini',
                kind: 'ptask',
                ctx: project.id,
                title: 'New task',
                label: 'Task',
                placeholder: 'e.g. Send the invoice',
              })
            }
            style={dashedBtn}
          >
            ＋ Add task
          </button>
        </div>
      )}

      {tab === 'notes' && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projectNotes.map((n) => (
            <div
              key={n.id}
              onClick={() => openSheet({ type: 'note', noteId: n.id })}
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
          {projectNotes.length === 0 && <EmptyState>No notes on this project yet.</EmptyState>}
          <button
            onClick={() => openSheet({ type: 'note', projectId: project.id })}
            style={dashedBtn}
          >
            ＋ Add note
          </button>
        </div>
      )}

      {tab === 'people' && (
        <div style={{ marginTop: 14 }}>
          {projectPeople.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {projectPeople.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openPerson(p.id)}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.cardBorder}`,
                    borderRadius: 12,
                    padding: '11px 13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Avatar name={p.name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.name}</div>
                    {p.role && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{p.role}</div>
                    )}
                  </div>
                  <span style={{ color: C.faint, fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No people linked yet.</EmptyState>
          )}
          {/* A real picker rather than the brief's placeholder — the link
              already exists in the model, it just had no home outside the
              edit sheet. */}
          <PersonPicker
            selected={projectPeople.map((p) => p.id)}
            onChange={(ids) => void store.setProjectPeople(project.id, ids)}
            label="Add or remove people"
            hint="Search the people you already have."
          />
        </div>
      )}

      {/* Keeps the last row clear of the bottom nav and the + button. */}
      <div style={{ height: 8 }} />
    </div>
  );
}
