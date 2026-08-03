import { C, CARD_SHADOW_LG, dashedBtn, SERIF } from '../tokens';
import { useStore } from '../store';
import { projectMeta, VITALITY_DOT, VITALITY_LABEL } from '../lib/derive';
import { shortDate } from '../lib/dates';
import { Plant } from '../components/Plant';
import { TaskRow } from '../components/TaskRow';
import { Checkbox, PencilIcon, SectionHeader, TypeBadge } from '../components/ui';
import type { ViewProps } from './types';
import { Linkify } from '../components/Linkify';

export function ProjectDetail({ wide, activeProjectId, openSheet, go }: ViewProps) {
  const store = useStore();
  const { projects, tasks, notes, dismissed } = store;
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

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        ...(wide ? { flex: '1 1 60%', minWidth: 0 } : {}),
      }}
    >
      {/* Header card */}
      <div
        style={{
          position: 'relative',
          background: C.card,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 16,
          boxShadow: CARD_SHADOW_LG,
          padding: 18,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => openSheet({ type: 'project', projectId: project.id })}
          aria-label="Edit project"
          title="Edit project"
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            background: 'none',
            border: 'none',
            padding: 5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 0,
          }}
        >
          <PencilIcon />
        </button>

        <div style={{ flexShrink: 0 }}>
          <Plant stage={m.stage} vitality={m.vitality} species={project.type} size={88} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TypeBadge
            type={project.type}
            label={project.type === 'active' ? 'Active project' : undefined}
          />
          <div style={{ fontSize: 13, color: C.softInk, marginTop: 10, lineHeight: 1.45 }}>
            {project.description.trim() ? (
              <Linkify text={project.description} />
            ) : (
              'Add a description…'
            )}
          </div>
          {project.type === 'active' && (project.startDate || project.endDate) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 9,
                fontSize: 12,
                color: C.softInk,
                fontWeight: 600,
              }}
            >
              <span style={{ color: C.muted, fontSize: 11 }}>📅</span>
              {project.startDate ? shortDate(project.startDate) : '—'} →{' '}
              {project.endDate ? shortDate(project.endDate) : '—'}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: VITALITY_DOT[m.vitality],
              }}
            />
            <span style={{ fontSize: 12, color: C.softInk, fontWeight: 600 }}>
              {VITALITY_LABEL[m.vitality]}
            </span>
          </div>
        </div>
      </div>

      {/* Progress (Active) — derived from tasks, per §3.1 */}
      {project.type === 'active' && (
        <div
          style={{
            background: C.deepSage,
            color: C.paper,
            borderRadius: 14,
            padding: '15px 16px',
            marginTop: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                opacity: 0.7,
                fontWeight: 600,
              }}
            >
              Progress
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500 }}>{m.pct}%</span>
          </div>
          <div
            style={{
              height: 7,
              background: 'rgba(255,255,255,.14)',
              borderRadius: 7,
              marginTop: 9,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'block',
                height: '100%',
                width: `${m.pct}%`,
                background: `linear-gradient(90deg,#8fce9c,${C.gold})`,
                borderRadius: 7,
              }}
            />
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            {m.done} of {m.total} tasks complete
          </div>
        </div>
      )}

      {/* Cadence + streak (Retainer) */}
      {project.type === 'retainer' && (
        <div
          style={{
            background: C.deepSage,
            color: C.paper,
            borderRadius: 14,
            padding: '15px 16px',
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                opacity: 0.7,
                fontWeight: 600,
              }}
            >
              Cadence
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 18, marginTop: 4 }}>
              ↻ {project.cadence === 'monthly' ? 'Monthly' : 'Weekly'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                opacity: 0.7,
                fontWeight: 600,
              }}
            >
              Streak
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 18, marginTop: 4 }}>
              {m.streak} {project.cadence === 'monthly' ? 'months' : 'weeks'}
            </div>
          </div>
        </div>
      )}

      {/* Milestones — Areas have none (they're reference homes, not work) */}
      {project.type !== 'area' && (
        <>
          <SectionHeader
            title="Milestones"
            meta={`${m.milestonesDone}/${m.milestonesTotal}`}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {project.milestones.map((ms, i) => (
              <div
                key={ms.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  padding: '12px 13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                }}
              >
                <Checkbox
                  done={ms.done}
                  size={20}
                  radius={6}
                  onClick={() => void store.toggleMilestone(project.id, ms.id)}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: ms.done ? C.muted : C.ink,
                    textDecoration: ms.done ? 'line-through' : 'none',
                  }}
                >
                  {ms.text}
                </span>
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
                    color: '#c3bba9',
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
              style={dashedBtn}
            >
              ＋ Add milestone
            </button>
          </div>
        </>
      )}

      {/* Related tasks */}
      <SectionHeader title="Related tasks" meta={`${m.done}/${m.total}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projectTasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            compact
            showSubtasks={false}
            onOpen={() => openSheet({ type: 'task', taskId: t.id })}
          />
        ))}
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

      {/* Related notes */}
      <SectionHeader title="Notes" meta={String(projectNotes.length)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <button
          onClick={() => openSheet({ type: 'note', projectId: project.id })}
          style={dashedBtn}
        >
          ＋ Add note
        </button>
      </div>

      {/* Notes to self */}
      <SectionHeader title="Notes to self" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {project.comments.map((c) => (
          <div key={c.id} style={{ background: '#efe9dc', borderRadius: 12, padding: '12px 13px' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 22 }}>
        {project.status === 'active' && (
          <>
            <button
              onClick={() => {
                void store.completeProject(project.id);
                go('projects');
              }}
              style={{
                width: '100%',
                background: C.sage,
                color: C.paper,
                border: 'none',
                borderRadius: 13,
                padding: 14,
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Mark as complete
            </button>
            <button
              onClick={() => void store.updateProject(project.id, { status: 'onhold' })}
              style={{
                width: '100%',
                background: 'none',
                color: C.softInk,
                border: `1px solid ${C.line}`,
                borderRadius: 13,
                padding: 13,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Put on hold
            </button>
          </>
        )}
        {project.status === 'onhold' && (
          <button
            onClick={() => void store.reopenProject(project.id)}
            style={{
              width: '100%',
              background: C.clay,
              color: '#fff',
              border: 'none',
              borderRadius: 13,
              padding: 14,
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to the garden
          </button>
        )}
        {project.status === 'done' && (
          <button
            onClick={() => void store.reopenProject(project.id)}
            style={{
              width: '100%',
              background: C.clay,
              color: '#fff',
              border: 'none',
              borderRadius: 13,
              padding: 14,
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Restore to garden
          </button>
        )}
      </div>
    </div>
  );
}
