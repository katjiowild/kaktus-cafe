import { useState } from 'react';
import { C, SERIF } from '../tokens';
import { useAccountEmail, useStore } from '../store';
import { isoDate, timeLabel } from '../lib/dates';
import { sortOpenTasks } from '../lib/derive';
import { SourceBadge } from '../components/ui';
import type { ViewProps } from './types';

const DOWS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Calendar({ wide, openSheet }: ViewProps) {
  const { tasks, meetings } = useStore();
  const accountEmail = useAccountEmail();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(isoDate());

  const todayIso = isoDate();
  const first = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  });

  const marked = new Set<string>();
  tasks.forEach((t) => {
    if (t.dueDate && !t.archived) marked.add(t.dueDate);
  });
  meetings.forEach((m) => marked.add(m.datetime.slice(0, 10)));

  const step = (dir: -1 | 1) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + dir, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const dayMeetings = meetings
    .filter((m) => m.datetime.slice(0, 10) === selected)
    .sort((a, b) => a.datetime.localeCompare(b.datetime));
  const dayTasks = sortOpenTasks(tasks.filter((t) => t.dueDate === selected && !t.archived));

  /**
   * Unlike Today — which has separate Meetings and Tasks sections — the day
   * agenda is one continuous list, so meetings and tasks belong in a single
   * chronological order. Untimed tasks fall to the end, matching how the task
   * lists treat them.
   */
  const UNTIMED = '99:99';
  const agenda = [
    ...dayMeetings.map((m) => ({
      kind: 'meeting' as const,
      key: m.id,
      at: timeLabel(m.datetime),
      meeting: m,
    })),
    ...dayTasks.map((t) => ({
      kind: 'task' as const,
      key: t.id,
      at: t.dueTime ?? UNTIMED,
      task: t,
    })),
  ].sort((a, b) => {
    const byTime = a.at.localeCompare(b.at);
    if (byTime !== 0) return byTime;
    // At the same minute, the meeting is the fixed commitment — show it first.
    if (a.kind !== b.kind) return a.kind === 'meeting' ? -1 : 1;
    return 0;
  });

  const selDate = new Date(`${selected}T00:00`);
  const selLabel =
    (selected === todayIso
      ? 'Today'
      : selDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })) +
    ' · ' +
    selDate.toLocaleDateString('en', { weekday: 'long' });

  const navBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: C.softInk,
    fontSize: 18,
    padding: '0 8px',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        ...(wide ? { display: 'flex', gap: 22, alignItems: 'flex-start' } : {}),
      }}
    >
      <div style={wide ? { flex: '0 0 46%', maxWidth: '46%', position: 'sticky', top: 4 } : {}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '6px 2px 14px',
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500 }}>{monthLabel}</div>
          <div>
            <button onClick={() => step(-1)} style={navBtn} aria-label="Previous month">
              ‹
            </button>
            <button onClick={() => step(1)} style={navBtn} aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gap: 5,
            marginBottom: 6,
          }}
        >
          {DOWS.map((d, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                letterSpacing: '.05em',
                padding: '4px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
          {Array.from({ length: first }).map((_, i) => (
            <div key={`pad${i}`} style={{ aspectRatio: '1' }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = iso === todayIso;
            const isSel = iso === selected;
            const has = marked.has(iso);
            return (
              <div
                key={iso}
                onClick={() => setSelected(iso)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13.5,
                  position: 'relative',
                  cursor: 'pointer',
                  color: isToday ? C.paper : C.ink,
                  background: isToday ? C.deepSage : 'transparent',
                  border: `1px solid ${isSel && !isToday ? C.clay : 'transparent'}`,
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {day}
                {has && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 5,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: isToday ? C.gold : C.clay,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={wide ? { flex: '1 1 54%', minWidth: 0 } : { marginTop: 18 }}>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, margin: '2px 2px 10px' }}>
          {selLabel}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {agenda.map((entry) =>
            entry.kind === 'meeting' ? (
              <div
                key={entry.key}
                onClick={() => openSheet({ type: 'meeting', meetingId: entry.meeting.id })}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: C.clay,
                  }}
                />
                <span style={{ flex: 1, fontSize: 14 }}>{entry.meeting.title}</span>
                <SourceBadge
                  source={entry.meeting.source}
                  account={accountEmail(entry.meeting.accountId)}
                />
                <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{entry.at}</span>
              </div>
            ) : (
              <div
                key={entry.key}
                onClick={() => openSheet({ type: 'task', taskId: entry.task.id })}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: C.sage,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    textDecoration: entry.task.done ? 'line-through' : 'none',
                    color: entry.task.done ? C.muted : C.ink,
                  }}
                >
                  {entry.task.title}
                </span>
                <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
                  {entry.task.done ? 'Done' : (entry.task.dueTime ?? 'Task')}
                </span>
              </div>
            ),
          )}
          {dayMeetings.length === 0 && dayTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: 22, color: C.muted, fontSize: 13.5 }}>
              Nothing planned for this day.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
