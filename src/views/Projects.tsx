import { ACCENT, C, SERIF } from '../tokens';
import { useStore } from '../store';
import { projectMeta } from '../lib/derive';
import { shortDate } from '../lib/dates';
import { Plant } from '../components/Plant';
import { Card, EmptyState, TypeBadge } from '../components/ui';
import type { ViewProps } from './types';

/** The garden itself now opens Today (v5 §1); this screen is the list/detail view. */
export function Projects({ openProject, wide }: ViewProps) {
  const { projects, tasks, notes, dismissed } = useStore();
  const live = projects.filter((p) => p.status !== 'done');

  const metaOf = (id: string) => {
    const p = projects.find((x) => x.id === id)!;
    return projectMeta(p, tasks, notes, dismissed);
  };

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        ...(wide
          ? {
              flex: '0 0 40%',
              maxWidth: '40%',
              position: 'sticky',
              top: 4,
              alignSelf: 'flex-start',
            }
          : {}),
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {live.map((p) => {
          const m = metaOf(p.id);
          return (
            <Card
              key={p.id}
              accent={ACCENT[p.type]}
              onClick={() => openProject(p.id)}
              style={{ display: 'flex', gap: 14 }}
            >
              <div style={{ flexShrink: 0 }}>
                <Plant stage={m.stage} vitality={m.vitality} species={p.type} size={60} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: 16.5,
                      fontWeight: 500,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {p.name}
                  </span>
                  {p.status === 'onhold' && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.05em',
                        padding: '3px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        flexShrink: 0,
                        background: C.paper2,
                        color: C.muted,
                      }}
                    >
                      On hold
                    </span>
                  )}
                  <TypeBadge type={p.type} />
                </div>

                {/* Active: live progress from tasks — never a manual count. */}
                {p.type === 'active' && (
                  <>
                    <div
                      style={{
                        height: 6,
                        background: C.paper2,
                        borderRadius: 6,
                        marginTop: 11,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'block',
                          height: '100%',
                          width: `${m.pct}%`,
                          background: `linear-gradient(90deg,${C.sage},${C.gold})`,
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    {/* Wraps rather than squeezes: at cover-screen width the
                        progress, dates and NEEDS WATER pill don't all fit on one
                        line, and crushing them reads as a bug. */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        rowGap: 6,
                        flexWrap: 'wrap',
                        marginTop: 8,
                        fontSize: 12,
                        color: C.softInk,
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap' }}>
                        {m.done} of {m.total} {m.total === 1 ? 'task' : 'tasks'} · {m.pct}%
                      </span>
                      {p.endDate && (
                        <span style={{ color: C.muted, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                          {p.startDate ? shortDate(p.startDate) : '—'} – {shortDate(p.endDate)}
                        </span>
                      )}
                      {m.needsWater && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.04em',
                            color: C.nudgeInk,
                            background: C.nudgeBg,
                            padding: '2px 7px',
                            borderRadius: 20,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          NEEDS WATER
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* Retainer: cadence + a live streak, derived from completions. */}
                {p.type === 'retainer' && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        marginTop: 10,
                        fontSize: 12.5,
                        color: C.softInk,
                      }}
                    >
                      <span style={{ color: C.clay, fontWeight: 600 }}>
                        ↻ {p.cadence === 'monthly' ? 'Monthly' : 'Weekly'}
                      </span>
                      <span style={{ color: C.muted }}>·</span>
                      <span>
                        {m.streak}-{p.cadence === 'monthly' ? 'month' : 'week'} streak
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 9 }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: i < m.streak ? C.clay : '#e2d9c6',
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Area: just a live note count. */}
                {p.type === 'area' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 11,
                      fontSize: 12.5,
                      color: C.softInk,
                    }}
                  >
                    <span>
                      {m.noteCount} {m.noteCount === 1 ? 'note' : 'notes'}
                    </span>
                    <span style={{ color: C.muted }}>· evergreen reference</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {live.length === 0 && <EmptyState>No projects yet. Tap + to plant one.</EmptyState>}
      </div>
    </div>
  );
}
