import { useMemo, useState } from 'react';
import { C, NARROW_MAX, WIDE_MAX } from '../tokens';
import { useStore } from '../store';
import { SearchIcon } from './ui';
import type { SheetState } from './Sheet';

interface Result {
  id: string;
  title: string;
  sub: string;
  icon: string;
  open: () => void;
}

/** One search across everything — no per-screen filters to remember. */
export function Search({
  wide,
  onClose,
  openProject,
  openPerson,
  openSheet,
}: {
  wide: boolean;
  onClose: () => void;
  openProject: (id: string) => void;
  openPerson: (id: string) => void;
  openSheet: (s: SheetState) => void;
}) {
  const { projects, tasks, notes, meetings, people } = useStore();
  const [q, setQ] = useState('');

  const results = useMemo<Result[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out: Result[] = [];

    for (const t of tasks) {
      if (!t.title.toLowerCase().includes(needle)) continue;
      const p = projects.find((x) => x.id === t.projectId);
      out.push({
        id: t.id,
        title: t.title,
        sub: 'Task' + (p ? ` · ${p.name}` : ''),
        icon: '✓',
        open: () => {
          onClose();
          openSheet({ type: 'task', taskId: t.id });
        },
      });
    }
    for (const n of notes) {
      if (!n.title.toLowerCase().includes(needle) && !n.body.toLowerCase().includes(needle)) continue;
      out.push({
        id: n.id,
        title: n.title,
        sub: 'Note',
        icon: '✎',
        open: () => {
          onClose();
          openSheet({ type: 'note', noteId: n.id });
        },
      });
    }
    for (const p of projects) {
      if (!p.name.toLowerCase().includes(needle)) continue;
      out.push({
        id: p.id,
        title: p.name,
        sub: `Project · ${p.type[0].toUpperCase()}${p.type.slice(1)}`,
        icon: '▤',
        open: () => {
          onClose();
          openProject(p.id);
        },
      });
    }
    for (const m of meetings) {
      if (
        !m.title.toLowerCase().includes(needle) &&
        !m.peopleText.toLowerCase().includes(needle)
      )
        continue;
      out.push({
        id: m.id,
        title: m.title,
        sub: `Meeting · ${new Date(m.datetime).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`,
        icon: '◷',
        open: () => {
          onClose();
          openSheet({ type: 'meeting', meetingId: m.id });
        },
      });
    }
    for (const pe of people) {
      if (!pe.name.toLowerCase().includes(needle) && !pe.role.toLowerCase().includes(needle))
        continue;
      out.push({
        id: pe.id,
        title: pe.name,
        sub: 'Person' + (pe.role ? ` · ${pe.role}` : ''),
        icon: '☺',
        open: () => {
          onClose();
          openPerson(pe.id);
        },
      });
    }
    return out;
  }, [q, projects, tasks, notes, meetings, people, onClose, openProject, openPerson, openSheet]);

  const wrap: React.CSSProperties = wide
    ? {
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 70,
        width: NARROW_MAX,
        right: `calc(max(0px, (100% - ${WIDE_MAX}px)/2))`,
        left: 'auto',
        background: C.paper,
        display: 'flex',
        flexDirection: 'column',
        animation: 'sbfade .2s ease',
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        maxWidth: NARROW_MAX,
        margin: '0 auto',
        background: C.paper,
        display: 'flex',
        flexDirection: 'column',
        animation: 'sbfade .2s ease',
      };

  return (
    <div style={wrap}>
      <div
        style={{
          padding: '16px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: `1px solid ${C.cardBorder}`,
          color: C.muted,
        }}
      >
        <SearchIcon />
        <input
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Search everything…"
          style={{
            flex: 1,
            border: 'none',
            background: 'none',
            fontFamily: 'inherit',
            fontSize: 17,
            color: C.ink,
            outline: 'none',
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: C.muted,
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 24px' }}>
        {results.map((r) => (
          <div
            key={`${r.sub}-${r.id}`}
            onClick={r.open}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 8px',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: C.paper2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                flexShrink: 0,
                color: C.sage,
              }}
            >
              {r.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{r.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{r.sub}</div>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              color: C.muted,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {q.trim()
              ? `No matches for “${q.trim()}”`
              : 'Search tasks, notes, projects, meetings & people'}
          </div>
        )}
      </div>
    </div>
  );
}
