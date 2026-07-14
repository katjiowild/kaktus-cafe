import { useCallback, useEffect, useRef, useState } from 'react';
import { C } from '../tokens';
import { useStore } from '../store';
import { shortDate } from '../lib/dates';
import { Card, EmptyState, PencilIcon, PinIcon } from '../components/ui';
import type { ViewProps } from './types';

export function Notes({ openSheet, wide }: ViewProps) {
  const store = useStore();
  const { notes, projects } = store;
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  /** Which note bodies are actually clipped by the 2-line clamp. */
  const [clipped, setClipped] = useState<Record<string, boolean>>({});
  const bodyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = notes.filter((n) => filter === null || n.projectId === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.date.localeCompare(a.date);
  });

  /**
   * "Read more" appears only when the text is genuinely truncated — measured on
   * the rendered element, not guessed from character count. Re-measured on fold
   * (width changes what fits).
   */
  const measure = useCallback(() => {
    setClipped((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [id, el] of Object.entries(bodyRefs.current)) {
        if (!el || !el.isConnected || expanded.includes(id)) continue;
        const isClipped = el.scrollHeight - el.clientHeight > 2;
        if (next[id] !== isClipped) {
          next[id] = isClipped;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [expanded]);

  useEffect(() => {
    measure();
  }, [measure, sorted.length, wide, filter]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const chips = [{ id: null as string | null, label: 'All' }, ...projects.map((p) => ({ id: p.id, label: p.name }))];

  return (
    <div style={{ animation: 'sbfade .3s ease' }}>
      {/* Filter by project — not by free-text category (§3.4). */}
      <div
        style={{
          display: 'flex',
          gap: 7,
          overflowX: 'auto',
          padding: '2px 2px 12px',
        }}
      >
        {chips.map((c) => {
          const on = filter === c.id;
          return (
            <button
              key={c.id ?? 'all'}
              onClick={() => setFilter(c.id)}
              style={{
                flexShrink: 0,
                border: `1px solid ${on ? C.deepSage : C.line}`,
                background: on ? C.deepSage : C.card,
                color: on ? C.paper : C.softInk,
                borderRadius: 20,
                padding: '6px 13px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {sorted.map((n) => {
          const project = projects.find((p) => p.id === n.projectId);
          const isExpanded = expanded.includes(n.id);
          const canExpand = isExpanded || clipped[n.id];
          return (
            <Card key={n.id}>
              {n.pinned && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    color: C.clay,
                    marginBottom: 5,
                  }}
                >
                  📌 PINNED
                </div>
              )}
              <div style={{ fontWeight: 600, fontSize: 15 }}>{n.title}</div>
              <div
                ref={(el) => {
                  bodyRefs.current[n.id] = el;
                }}
                style={{
                  fontSize: 13.5,
                  color: C.softInk,
                  lineHeight: 1.5,
                  marginTop: 5,
                  whiteSpace: 'pre-wrap',
                  ...(isExpanded
                    ? {}
                    : {
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }),
                }}
              >
                {n.body}
              </div>
              {canExpand && (
                <span
                  onClick={() =>
                    setExpanded((e) =>
                      e.includes(n.id) ? e.filter((x) => x !== n.id) : [...e, n.id],
                    )
                  }
                  style={{
                    fontSize: 11.5,
                    color: C.clay,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-block',
                    marginTop: 6,
                  }}
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </span>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                {project && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 20,
                      background: C.paper2,
                      color: C.sage,
                    }}
                  >
                    {project.name}
                  </span>
                )}
                <span
                  style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginLeft: 'auto' }}
                >
                  {shortDate(n.date)}
                </span>
                <button
                  onClick={() => void store.toggleNotePin(n.id)}
                  title="Pin to top"
                  aria-label="Pin to top"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    lineHeight: 0,
                  }}
                >
                  <PinIcon pinned={n.pinned} />
                </button>
                <button
                  onClick={() => openSheet({ type: 'note', noteId: n.id })}
                  title="Edit note"
                  aria-label="Edit note"
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
            </Card>
          );
        })}
        {sorted.length === 0 && (
          <EmptyState>
            {filter ? 'No notes in this project yet.' : 'No notes yet. Tap + to capture one.'}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
