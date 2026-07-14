import { ACCENT, C, SERIF } from '../tokens';
import { useStore } from '../store';
import { projectMeta } from '../lib/derive';
import { shortDate } from '../lib/dates';
import { Plant } from '../components/Plant';
import { Card, TypeBadge } from '../components/ui';
import type { ViewProps } from './types';

/** Gentle vertical jitter so the plants read as planted, not lined up. */
const LIFTS = [0, -13, 9, -6, 13, -8, 4, -15, 10, -4];

export function Projects({ openProject, wide }: ViewProps) {
  const { projects, tasks, notes, dismissed } = useStore();
  const live = projects.filter((p) => p.status !== 'done');
  const planted = projects.filter((p) => p.status === 'active');

  const metaOf = (id: string) => {
    const p = projects.find((x) => x.id === id)!;
    return projectMeta(p, tasks, notes, dismissed);
  };

  const thirsty = planted.filter((p) => metaOf(p.id).needsWater).length;
  const caption = planted.length === 0 ? '' : thirsty ? `${thirsty} need water` : 'all thriving';
  // No cap on the garden (owner's call — the design's 10-project queue was
  // dropped). Many plants simply scroll sideways.
  const overlap = planted.length > 6 ? -30 : -20;

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
      {/* Garden — plants in the ground, not pots */}
      <div
        style={{
          margin: '4px 2px 8px',
          border: '1px solid #d9cdb0',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'linear-gradient(#eef2ea 0%,#e7ece1 26%,#e4d9bd 27%,#d9caa4 100%)',
        }}
      >
        <div style={{ position: 'relative', minHeight: 130, padding: '7px 12px 0' }}>
          <div
            style={{
              position: 'absolute',
              left: '6%',
              bottom: 4,
              width: 76,
              height: 34,
              background: 'linear-gradient(#cfc3a6,#b7a884)',
              borderRadius: '40% 46% 30% 34%/60% 60% 40% 40%',
              opacity: 0.85,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '8%',
              bottom: 0,
              width: 98,
              height: 40,
              background: 'linear-gradient(#d3c8ac,#bcad88)',
              borderRadius: '42% 38% 34% 40%/64% 58% 42% 40%',
              opacity: 0.8,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '43%',
              bottom: 8,
              width: 62,
              height: 26,
              background: 'linear-gradient(#c9bd9f,#b3a37e)',
              borderRadius: '44% 40% 32% 36%/62% 60% 40% 40%',
              opacity: 0.7,
            }}
          />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: planted.length > 5 ? 'flex-start' : 'center',
              minHeight: 122,
              overflowX: 'auto',
              overflowY: 'hidden',
            }}
          >
            {planted.map((p, i) => {
              const m = metaOf(p.id);
              let size = 54 + m.stage * 9;
              if (p.type === 'area') size += 22;
              if (p.type === 'retainer') size += 8;
              const lift = LIFTS[i % LIFTS.length];
              return (
                <Plant
                  key={p.id}
                  stage={m.stage}
                  vitality={m.vitality}
                  species={p.type}
                  size={size}
                  onClick={() => openProject(p.id)}
                  title={p.name}
                  style={{
                    position: 'relative',
                    flexShrink: 0,
                    marginLeft: i === 0 ? 0 : overlap,
                    transform: `translateY(${lift}px)`,
                    zIndex: 20 + lift,
                  }}
                />
              );
            })}
            {planted.length === 0 && (
              <div style={{ color: C.muted, fontSize: 13, padding: '40px 0' }}>
                Your garden is empty — start a project.
              </div>
            )}
          </div>
        </div>
        <div style={{ height: 16, background: 'linear-gradient(#b69c6e,#9a8054)' }} />
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#7a7263',
            fontWeight: 600,
            padding: '8px 0 11px',
            letterSpacing: '.02em',
            background: '#e9dcbe',
          }}
        >
          Your garden — {planted.length} {planted.length === 1 ? 'plant' : 'plants'}
          {caption && ` · ${caption}`}
        </div>
      </div>

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

        {live.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: C.muted, fontSize: 14 }}>
            No projects yet. Tap + to plant one.
          </div>
        )}
      </div>
    </div>
  );
}
