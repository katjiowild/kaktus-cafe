import { C, SERIF } from '../tokens';
import { useAccountEmail, useStore } from '../store';
import { isoDate, timeLabel } from '../lib/dates';
import { projectMeta, sortOpenTasks } from '../lib/derive';
import { Garden } from '../components/Garden';
import { Plant } from '../components/Plant';
import { TaskRow } from '../components/TaskRow';
import { Card, EmptyState, SourceBadge } from '../components/ui';
import type { ViewProps } from './types';

export function Today({ openProject, openSheet }: ViewProps) {
  const store = useStore();
  const accountEmail = useAccountEmail();
  const { projects, tasks, meetings, notes, dismissed } = store;
  const todayIso = isoDate();
  const notesFor = (meetingId: string) => notes.filter((n) => n.meetingId === meetingId);

  // §5.3 — Active projects idle for ≥7 days, not dismissed.
  const nudges = projects
    .filter((p) => projectMeta(p, tasks, notes, dismissed).nudge)
    .map((p) => ({ project: p, meta: projectMeta(p, tasks, notes, dismissed) }));

  const todayMeetings = meetings
    .filter((m) => m.datetime.slice(0, 10) === todayIso)
    .sort((a, b) => a.datetime.localeCompare(b.datetime));

  // Today = anything due today or already overdue, still open. Urgent floats up.
  const todayTasks = sortOpenTasks(
    tasks.filter((t) => !t.done && !t.archived && t.dueDate !== null && t.dueDate <= todayIso),
  );

  return (
    <div style={{ animation: 'sbfade .3s ease' }}>
      {/* The garden opens Today — the first thing seen (v5 §1). */}
      <Garden onOpenProject={openProject} />

      {nudges.map(({ project, meta }) => (
        <div
          key={project.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            background: C.nudgeBg,
            border: `1px solid ${C.nudgeBorder}`,
            borderRadius: 14,
            padding: '13px 14px',
            margin: '6px 2px 4px',
          }}
        >
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            <Plant stage={meta.stage} vitality={meta.vitality} species={project.type} size={44} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: C.nudgeInk,
                fontWeight: 700,
              }}
            >
              Needs a little water
            </div>
            <div style={{ fontSize: 13.5, color: C.softInk, lineHeight: 1.45, marginTop: 3 }}>
              Haven't touched <b style={{ color: C.ink }}>{project.name}</b> in{' '}
              {meta.daysSinceActivity} days — take a look?
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
              <button
                onClick={() => openProject(project.id)}
                style={{
                  background: C.sage,
                  color: C.paper,
                  border: 'none',
                  borderRadius: 9,
                  padding: '7px 13px',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Open project
              </button>
              <button
                onClick={() => void store.dismissNudge(project.id)}
                style={{
                  background: 'none',
                  color: C.muted,
                  border: 'none',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ))}

      <div style={{ margin: '22px 2px 10px' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 19 }}>Meetings</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {todayMeetings.map((m) => (
          <Card
            key={m.id}
            onClick={() => openSheet({ type: 'meeting', meetingId: m.id })}
            style={{ padding: '13px 15px', display: 'flex', gap: 13, alignItems: 'center' }}
          >
            <div style={{ flexShrink: 0, width: 46, textAlign: 'center' }}>
              <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, color: C.deepSage }}>
                {timeLabel(m.datetime)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.title}</div>
              {m.peopleText && (
                <div style={{ fontSize: 12.5, color: C.softInk, marginTop: 3 }}>
                  With {m.peopleText}
                </div>
              )}
              {m.location && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  📍 {m.location}
                </div>
              )}
              {notesFor(m.id).length > 0 && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.softInk,
                    marginTop: 6,
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {notesFor(m.id)[0].body}
                </div>
              )}
            </div>
            <SourceBadge source={m.source} account={accountEmail(m.accountId)} />
          </Card>
        ))}
        {todayMeetings.length === 0 && (
          <div style={{ textAlign: 'center', padding: 22, color: C.muted, fontSize: 13.5 }}>
            No meetings today.
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '20px 2px 10px',
        }}
      >
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 19 }}>Tasks</div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
          {todayTasks.length} to do
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {todayTasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onOpen={() => openSheet({ type: 'task', taskId: t.id })}
            onAddSubtask={() =>
              openSheet({
                type: 'mini',
                kind: 'subtask',
                ctx: t.id,
                title: 'Add subtask',
                label: 'Subtask',
                placeholder: 'Break it into a small step',
              })
            }
          />
        ))}
        {todayTasks.length === 0 && <EmptyState>Nothing left for today. Enjoy the space.</EmptyState>}
      </div>
    </div>
  );
}
