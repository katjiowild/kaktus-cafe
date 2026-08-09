import { C, CARD_SHADOW } from '../tokens';
import { dueLabel, isOverdue, recurrenceLabel } from '../lib/dates';
import { useStore } from '../store';
import type { Task } from '../types';
import { Checkbox, OverdueFlag, ProjectChip, UrgentFlag } from './ui';

/**
 * The tight one-line row Today uses: rows share a single card and are divided
 * by a hairline rather than floating as separate cards, and the due date sits
 * right-aligned instead of in a meta row beneath the title.
 *
 * Carries less than {@link TaskRow} — no project chip or recurrence mark.
 * Overdue reads as red on the date, as in the design; urgency keeps its badge
 * because it reorders the list and would otherwise be invisible. Subtasks nest
 * underneath, indented past the checkbox, so a task that's really several
 * steps still reads as several steps here.
 */
export function TaskLine({
  task,
  last,
  onOpen,
  onAddSubtask,
}: {
  task: Task;
  last: boolean;
  onOpen: () => void;
  onAddSubtask?: () => void;
}) {
  const store = useStore();
  const overdue = isOverdue(task.dueDate, task.done);

  return (
    <div
      style={{
        padding: '13px 15px',
        borderBottom: last ? 'none' : `1px solid ${C.paper2}`,
        opacity: task.done ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Checkbox
        done={task.done}
        size={20}
        radius={10}
        onClick={() => void store.toggleTask(task.id)}
      />
      <div
        onClick={onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14.5,
          fontWeight: 600,
          lineHeight: 1.3,
          wordBreak: 'break-word',
          cursor: 'pointer',
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? C.muted : C.ink,
        }}
      >
        {task.title}
      </div>
        {task.urgent && !task.done && <UrgentFlag />}
        <span
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 600,
            color: overdue ? C.overdue : C.muted,
          }}
        >
          {dueLabel(task.dueDate)}
          {task.dueTime ? ` · ${task.dueTime}` : ''}
        </span>
      </div>

      {/* Only tasks that already have steps get the nested block. Putting an
          "add subtask" line under every row would undo the tight stacking;
          the first one is added from the task itself. */}
      {task.subtasks.length > 0 && (
        <div style={{ margin: '9px 0 1px 32px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {task.subtasks.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Checkbox
                done={s.done}
                size={16}
                radius={8}
                onClick={() => void store.toggleSubtask(task.id, s.id)}
              />
              <span
                style={{
                  fontSize: 13,
                  color: s.done ? C.muted : C.softInk,
                  textDecoration: s.done ? 'line-through' : 'none',
                }}
              >
                {s.text}
              </span>
            </div>
          ))}
          {onAddSubtask && (
            <button
              onClick={onAddSubtask}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 12.5,
                color: C.clay,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskRow({
  task,
  onOpen,
  onAddSubtask,
  showSubtasks = true,
  compact = false,
}: {
  task: Task;
  onOpen: () => void;
  onAddSubtask?: () => void;
  showSubtasks?: boolean;
  compact?: boolean;
}) {
  const store = useStore();
  const project = store.projects.find((p) => p.id === task.projectId);
  const overdue = isOverdue(task.dueDate, task.done);
  const subDone = task.subtasks.filter((s) => s.done).length;

  return (
    <div
      style={{
        padding: compact ? '12px 13px' : '13px 14px',
        background: C.card,
        border: `1px solid ${overdue ? C.overdueBorder : C.cardBorder}`,
        borderRadius: 13,
        boxShadow: CARD_SHADOW,
        opacity: task.done ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Checkbox done={task.done} onClick={() => void store.toggleTask(task.id)} />
        <div onClick={onOpen} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 450,
              lineHeight: 1.3,
              wordBreak: 'break-word',
              textDecoration: task.done ? 'line-through' : 'none',
              color: task.done ? C.muted : C.ink,
            }}
          >
            {task.title}
          </div>
          {!compact && (
            <div
              style={{
                display: 'flex',
                gap: 7,
                alignItems: 'center',
                marginTop: 6,
                flexWrap: 'wrap',
              }}
            >
              {task.urgent && !task.done && <UrgentFlag />}
              {overdue && <OverdueFlag />}
              {project && <ProjectChip name={project.name} />}
              {task.recurrence && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: C.clay }}>
                  ↻ {recurrenceLabel(task.recurrence)}
                </span>
              )}
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: overdue ? C.overdue : C.muted,
                }}
              >
                {dueLabel(task.dueDate)}
                {task.dueTime ? ` · ${task.dueTime}` : ''}
              </span>
              {task.subtasks.length > 0 && (
                <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>
                  {subDone}/{task.subtasks.length}
                </span>
              )}
            </div>
          )}
        </div>
        {compact && task.urgent && !task.done && <UrgentFlag />}
        {compact && overdue && <OverdueFlag />}
      </div>

      {showSubtasks && (
        <div style={{ margin: '10px 0 0 34px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {task.subtasks.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Checkbox
                done={s.done}
                size={16}
                radius={5}
                onClick={() => void store.toggleSubtask(task.id, s.id)}
              />
              <span
                style={{
                  fontSize: 13.5,
                  color: s.done ? C.muted : C.softInk,
                  textDecoration: s.done ? 'line-through' : 'none',
                }}
              >
                {s.text}
              </span>
              <button
                onClick={() => void store.removeSubtask(task.id, s.id)}
                aria-label="Remove sub-task"
                style={{
                  marginLeft: 'auto',
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
          {onAddSubtask && (
            <div
              onClick={onAddSubtask}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                color: C.clay,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 2,
              }}
            >
              ＋ Add subtask
            </div>
          )}
        </div>
      )}
    </div>
  );
}
