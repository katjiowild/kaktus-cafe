import { useCallback, useEffect, useRef, useState } from 'react';
import { C } from '../tokens';
import { useStore } from '../store';
import { shortDate } from '../lib/dates';
import { Card, EmptyState, PencilIcon, PinIcon } from '../components/ui';
import type { ViewProps } from './types';
import type { Note } from '../types';
import { Linkify } from '../components/Linkify';

export function Notes({ openSheet, wide }: ViewProps) {
  const store = useStore();
  const { notes, projects, meetings } = store;
  const meetingOf = (id: string | null) => (id ? meetings.find((m) => m.id === id) : undefined);
  const [expanded, setExpanded] = useState<string[]>([]);
  /** Which note bodies are actually clipped by the 2-line clamp. */
  const [clipped, setClipped] = useState<Record<string, boolean>>({});
  const bodyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // A note with no project, no people and no meeting is one you'd struggle to
  // find again — this filter is how you go and give it a home.
  const isUntagged = (n: Note) =>
    n.projectId === null && n.personIds.length === 0 && n.meetingId === null;
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const untaggedCount = notes.filter(isUntagged).length;

  const sorted = [...notes]
    .filter((n) => !untaggedOnly || isUntagged(n))
    .sort((a, b) => {
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
  }, [measure, sorted.length, wide]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);


  return (
    <div style={{ animation: 'sbfade .3s ease' }}>
      {notes.length > 0 && (
        <div style={{ display: 'flex', margin: '0 2px 12px' }}>
          <button
            onClick={() => setUntaggedOnly((v) => !v)}
            aria-pressed={untaggedOnly}
            style={{
              border: `1px solid ${untaggedOnly ? C.deepSage : '#e6c9bd'}`,
              background: untaggedOnly ? C.deepSage : C.card,
              color: untaggedOnly ? C.paper : C.clay,
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            No tags{untaggedCount > 0 ? ` (${untaggedCount})` : ''}
          </button>
        </div>
      )}

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
                <Linkify text={n.body} />
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
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  rowGap: 6,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
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
                {meetingOf(n.meetingId) && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 20,
                      background: C.paper2,
                      color: C.clay,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ◷ {meetingOf(n.meetingId)!.title}
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
            {untaggedOnly
              ? 'Every note is tagged to something. Nothing loose.'
              : 'No notes yet. Tap + to capture one.'}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
