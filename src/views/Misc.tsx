import { ACCENT, C, SERIF } from '../tokens';
import { useAccountEmail, useStore } from '../store';
import { shortDate, timeLabel } from '../lib/dates';
import { projectMeta, VITALITY_LABEL, type Vitality } from '../lib/derive';
import { Plant } from '../components/Plant';
import { Card, EmptyState, PersonIcon, SourceBadge, TypeBadge } from '../components/ui';
import type { View, ViewProps } from './types';

// ---------------- Meetings ----------------

export function Meetings({ openSheet }: ViewProps) {
  const { meetings, notes } = useStore();
  const accountEmail = useAccountEmail();
  const notesFor = (meetingId: string) => notes.filter((n) => n.meetingId === meetingId);
  const sorted = [...meetings].sort((a, b) => a.datetime.localeCompare(b.datetime));

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
        marginTop: 6,
      }}
    >
      {sorted.map((m) => {
        const d = new Date(m.datetime);
        return (
          <Card
            key={m.id}
            onClick={() => openSheet({ type: 'meeting', meetingId: m.id })}
            style={{ display: 'flex', gap: 13 }}
          >
            <div
              style={{
                flexShrink: 0,
                textAlign: 'center',
                background: C.deepSage,
                color: C.paper,
                borderRadius: 11,
                padding: '8px 10px',
                minWidth: 52,
                height: 'fit-content',
              }}
            >
              <div style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1, fontWeight: 500 }}>
                {d.getDate()}
              </div>
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  opacity: 0.8,
                  marginTop: 3,
                }}
              >
                {d.toLocaleDateString('en', { month: 'short' })}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{m.title}</span>
                <SourceBadge source={m.source} account={accountEmail(m.accountId)} />
              </div>
              <div style={{ fontSize: 12, color: C.clay, fontWeight: 600, marginTop: 2 }}>
                {timeLabel(m.datetime)} · {shortDate(m.datetime)}
              </div>
              {m.peopleText && (
                <div style={{ fontSize: 12.5, color: C.softInk, marginTop: 6 }}>
                  With {m.peopleText}
                </div>
              )}
              {m.location && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    marginTop: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  📍 {m.location}
                </div>
              )}
              {notesFor(m.id).length > 0 && (
                <div
                  style={{
                    marginTop: 7,
                    paddingTop: 7,
                    borderTop: `1px solid ${C.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      color: C.softInk,
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {notesFor(m.id)[0].body}
                  </div>
                  {notesFor(m.id).length > 1 && (
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 4 }}>
                      +{notesFor(m.id).length - 1} more{' '}
                      {notesFor(m.id).length === 2 ? 'note' : 'notes'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
      {sorted.length === 0 && <EmptyState>Nothing on the books. Tap + to add a meeting.</EmptyState>}
    </div>
  );
}

// ---------------- Archive ----------------

export function Archive({ openProject }: ViewProps) {
  const store = useStore();
  const { projects, tasks, notes, dismissed } = store;
  const archived = projects
    .filter((p) => p.status === 'done')
    .sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? ''));

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        marginTop: 6,
      }}
    >
      {archived.map((p) => {
        const m = projectMeta(p, tasks, notes, dismissed);
        return (
          <div
            key={p.id}
            style={{
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              borderLeft: `4px solid ${ACCENT[p.type]}`,
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 13,
            }}
          >
            <div style={{ flexShrink: 0, opacity: 0.85 }}>
              <Plant
                stage={m.stage}
                vitality={m.vitality}
                species={p.type}
                size={48}
                onClick={() => openProject(p.id)}
              />
            </div>
            <div
              onClick={() => openProject(p.id)}
              style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: SERIF, fontSize: 15.5, fontWeight: 500 }}>{p.name}</span>
                <TypeBadge type={p.type} />
              </div>
              {p.completedOn && (
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                  Completed {shortDate(p.completedOn)}
                </div>
              )}
            </div>
            <button
              onClick={() => void store.reopenProject(p.id)}
              style={{
                flexShrink: 0,
                background: 'none',
                border: `1px solid #e2dbc9`,
                borderRadius: 9,
                padding: '7px 11px',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                color: C.softInk,
                cursor: 'pointer',
              }}
            >
              Restore
            </button>
          </div>
        );
      })}
      {archived.length === 0 && <EmptyState>Completed projects land here.</EmptyState>}
    </div>
  );
}

// ---------------- More ----------------

const MORE: { view: View; label: string; sub: string; glyph: React.ReactNode }[] = [
  { view: 'tasks', label: 'Tasks', sub: 'Every open & completed task', glyph: '✓' },
  { view: 'meetings', label: 'Meetings', sub: 'Everything on the books', glyph: '🗓️' },
  { view: 'people', label: 'People', sub: 'Your light CRM', glyph: <PersonIcon /> },
  { view: 'system', label: 'Visual system', sub: 'Plants, types & the radial menu', glyph: '❋' },
  { view: 'archive', label: 'Archive', sub: 'Completed projects', glyph: '🗄️' },
  { view: 'settings', label: 'Backup & settings', sub: 'Backup, connections, data', glyph: '⚙️' },
];

export function More({ go }: ViewProps) {
  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        marginTop: 6,
      }}
    >
      {MORE.map((i) => (
        <button
          key={i.view}
          onClick={() => go(i.view)}
          style={{
            textAlign: 'left',
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 13,
            boxShadow: '0 1px 2px rgba(36,43,40,.05)',
            padding: '15px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
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
              fontSize: 16,
              flexShrink: 0,
              color: C.sage,
            }}
          >
            {i.glyph}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{i.label}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{i.sub}</div>
          </div>
          <span style={{ color: '#c3bba9', fontSize: 18 }}>›</span>
        </button>
      ))}
    </div>
  );
}

// ---------------- Visual system ----------------

const GROWTH = ['Sprout', 'Seedling', 'Growing', 'Mature', 'Blooming'];
const VITALITIES: Vitality[] = ['healthy', 'dry', 'yellowing', 'browning'];

export function VisualSystem() {
  const panel: React.CSSProperties = {
    background: '#efe9dc',
    border: '1px solid #e2dbc9',
    borderRadius: 14,
    padding: '14px 6px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  };
  const caption: React.CSSProperties = {
    fontSize: 9,
    color: C.muted,
    fontWeight: 600,
    marginTop: 2,
  };
  const h: React.CSSProperties = {
    fontFamily: SERIF,
    fontWeight: 500,
    fontSize: 18,
    margin: '20px 2px 10px',
  };

  return (
    <div style={{ animation: 'sbfade .3s ease' }}>
      <div style={{ fontSize: 13, color: C.softInk, lineHeight: 1.5, margin: '4px 2px' }}>
        Two independent signals live in one plant: <b>size shows progress</b>,{' '}
        <b>colour shows recency of care</b>.
      </div>

      <div style={h}>Growth stages — from progress</div>
      <div style={panel}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} style={{ textAlign: 'center' }}>
            <Plant stage={s} vitality="healthy" species="active" size={56} />
            <div style={caption}>{GROWTH[s - 1]}</div>
          </div>
        ))}
      </div>

      <div style={h}>Vitality — from neglect</div>
      <div style={panel}>
        {VITALITIES.map((v) => (
          <div key={v} style={{ textAlign: 'center' }}>
            <Plant stage={4} vitality={v} species="active" size={56} />
            <div style={caption}>{VITALITY_LABEL[v]}</div>
          </div>
        ))}
      </div>

      <div style={h}>Project types</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {(
          [
            [
              'active',
              'Active',
              'Finite work with a start & end. Task-driven progress bar; the plant grows with completion and wilts if neglected.',
            ],
            [
              'retainer',
              'Retainer',
              'Ongoing upkeep, no end date. Shows cadence & streak instead of a bar; exempt from neglect nudges.',
            ],
            [
              'area',
              'Area',
              'An evergreen home for reference notes. No progress, a calm constant plant.',
            ],
          ] as const
        ).map(([type, name, desc]) => (
          <div
            key={type}
            style={{
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              borderLeft: `4px solid ${ACCENT[type]}`,
              borderRadius: 12,
              padding: '13px 14px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <Plant stage={3} vitality="healthy" species={type} size={52} />
            </div>
            <div>
              <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500 }}>{name}</span>
              <div style={{ fontSize: 12, color: C.softInk, marginTop: 5, lineHeight: 1.4 }}>
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}
