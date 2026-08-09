import { C, sectionHeader } from '../tokens';
import { useStore } from '../store';
import { sortOpenTasks } from '../lib/derive';
import { TaskRow } from '../components/TaskRow';
import { EmptyState } from '../components/ui';
import type { ViewProps } from './types';

export function Tasks({ openSheet }: ViewProps) {
  const { tasks } = useStore();
  // Archived rows are completed instances of recurring tasks — history, not list
  // items. The live list stays honest: urgent first, then soonest due, then done.
  const live = tasks.filter((t) => !t.archived);
  const open = sortOpenTasks(live.filter((t) => !t.done));
  const done = live
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  return (
    <div style={{ animation: 'sbfade .3s ease' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '8px 2px 10px',
        }}
      >
        <div style={sectionHeader}>All tasks</div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{open.length} open</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[...open, ...done].map((t) => (
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
        {live.length === 0 && <EmptyState>No tasks yet. Tap + to add one.</EmptyState>}
      </div>
    </div>
  );
}
