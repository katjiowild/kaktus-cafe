import { useState } from 'react';
import { C, sectionHeader } from '../tokens';
import { useStore } from '../store';
import { sortOpenTasks } from '../lib/derive';
import { TaskRow } from '../components/TaskRow';
import { Checkbox, EmptyState } from '../components/ui';
import type { ViewProps } from './types';

export function Tasks({ openSheet }: ViewProps) {
  const store = useStore();
  const { tasks } = store;

  // Filter and selection are independent, but selection takes over the
  // control row while it's on — the two aren't meant to run together.
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  // Archived rows are completed instances of recurring tasks — history, not list
  // items. The live list stays honest: urgent first, then soonest due, then done.
  const live = tasks.filter((t) => !t.archived);
  const openAll = sortOpenTasks(live.filter((t) => !t.done));
  const pendingCount = openAll.filter((t) => t.dueDate === null).length;
  const open = openAll.filter((t) => !pendingOnly || t.dueDate === null);
  // A finished task isn't part of the backlog the Pending filter is for.
  const done = pendingOnly
    ? []
    : live
        .filter((t) => t.done)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const shown = [...open, ...done];

  const toggleSelected = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const markSelectedPending = async () => {
    await store.markTasksPending(selected);
    stopSelecting();
  };

  const chip = (on: boolean): React.CSSProperties => ({
    border: `1px solid ${on ? C.deepSage : C.line}`,
    background: on ? C.deepSage : C.card,
    color: on ? C.paper : C.softInk,
    borderRadius: 20,
    padding: '6px 12px',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  });

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

      {live.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            margin: '0 2px 10px',
          }}
        >
          {selecting ? (
            <>
              <span style={{ fontSize: 12.5, color: C.softInk, fontWeight: 600 }}>
                {selected.length} selected
              </span>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button onClick={stopSelecting} style={chip(false)}>
                  Cancel
                </button>
                <button
                  onClick={() => void markSelectedPending()}
                  disabled={selected.length === 0}
                  style={{
                    ...chip(true),
                    opacity: selected.length === 0 ? 0.5 : 1,
                    cursor: selected.length === 0 ? 'default' : 'pointer',
                  }}
                >
                  Mark as pending
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setPendingOnly((p) => !p)}
                aria-pressed={pendingOnly}
                style={chip(pendingOnly)}
              >
                Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </button>
              <button onClick={() => setSelecting(true)} style={{ ...chip(false), marginLeft: 'auto' }}>
                Select
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {shown.map((t) => (
          <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {selecting && (
              <div style={{ paddingTop: 15, flexShrink: 0 }}>
                <Checkbox done={selected.includes(t.id)} onClick={() => toggleSelected(t.id)} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <TaskRow
                task={t}
                onOpen={() =>
                  selecting ? toggleSelected(t.id) : openSheet({ type: 'task', taskId: t.id })
                }
                onAddSubtask={
                  selecting
                    ? undefined
                    : () =>
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
            </div>
          </div>
        ))}
        {live.length === 0 && <EmptyState>No tasks yet. Tap + to add one.</EmptyState>}
        {live.length > 0 && shown.length === 0 && (
          <EmptyState>Nothing pending right now.</EmptyState>
        )}
      </div>
    </div>
  );
}
