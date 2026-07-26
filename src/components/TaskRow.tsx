import { C, CARD_SHADOW } from '../tokens';
import { dueLabel, isOverdue, recurrenceLabel } from '../lib/dates';
import { useStore } from '../store';
import type { Task } from '../types';
import { Checkbox, OverdueFlag, ProjectChip, UrgentFlag } from './ui';

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
