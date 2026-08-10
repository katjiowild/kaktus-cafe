import { ACCENT, C, sectionHeader, SERIF } from '../tokens';
import { useAccountEmail, useStore } from '../store';
import { shortDate, timeLabel } from '../lib/dates';
import { VITALITY_LABEL, type Vitality } from '../lib/derive';
import { Plant } from '../components/Plant';
import { Card, EmptyState, LocationIcon, NavIcon, SourceBadge } from '../components/ui';
import type { View, ViewProps } from './types';
import { Linkify } from '../components/Linkify';

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
                  <LocationIcon /> <Linkify text={m.location} />
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

// ---------------- More ----------------

const MORE: { view: View; label: string; sub: string; icon: string }[] = [
  { view: 'tasks', label: 'Tasks', sub: 'Every open & completed task', icon: 'tasks' },
  { view: 'meetings', label: 'Meetings', sub: 'Everything on the books', icon: 'meetings' },
  { view: 'people', label: 'People', sub: 'Your light CRM', icon: 'people' },
  { view: 'system', label: 'Visual system', sub: 'Plants, types & the radial menu', icon: 'system' },
  {
    view: 'settings',
    label: 'Backup & settings',
    sub: 'Backup, connections, data',
    icon: 'settings',
  },
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
            borderRadius: 14,
            boxShadow: '0 1px 2px rgba(36,43,40,.05)',
            padding: '14px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: C.paper2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: C.sage,
            }}
          >
            <NavIcon name={i.icon} size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{i.label}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{i.sub}</div>
          </div>
          <span style={{ color: C.faint, fontSize: 18 }}>›</span>
        </button>
      ))}
    </div>
  );
}

// ---------------- Visual system ----------------

const GROWTH = [
  { stage: 1, label: 'Seedling', band: '0–4 tasks' },
  { stage: 2, label: 'Growing', band: '5–8' },
  { stage: 3, label: 'Mature', band: '9–12' },
  { stage: 4, label: 'Blooming', band: '13+' },
];
const VITALITIES: Vitality[] = ['healthy', 'dry', 'yellowing', 'browning'];

/** Type no longer picks the plant, so these are just three different ones. */
const SAMPLE_SPECIES: Record<string, string> = {
  active: 'echeveria',
  retainer: 'aeonium',
  area: 'agave',
};

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
  const h: React.CSSProperties = { ...sectionHeader, margin: '20px 2px 10px' };

  return (
    <div style={{ animation: 'sbfade .3s ease' }}>
      <div style={{ fontSize: 13, color: C.softInk, lineHeight: 1.5, margin: '4px 2px' }}>
        Two independent signals live in one plant: <b>size shows work done</b>,{' '}
        <b>colour shows recency of care</b>. Which plant it is, is your choice — species
        carries no meaning.
      </div>

      <div style={h}>Growth — from completed tasks</div>
      <div style={panel}>
        {GROWTH.map((g) => (
          <div key={g.stage} style={{ textAlign: 'center' }}>
            <Plant stage={g.stage} vitality="healthy" species="echeveria" size={56} />
            <div style={caption}>{g.label}</div>
            <div style={{ ...caption, color: C.faint, marginTop: 0 }}>{g.band}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, margin: '8px 2px 0' }}>
        A recurring task counts once, plus a quarter of its repeats — so steady upkeep
        matures a plant slowly, and variety outgrows repetition.
      </div>

      <div style={h}>Vitality — from neglect</div>
      <div style={panel}>
        {VITALITIES.map((v) => (
          <div key={v} style={{ textAlign: 'center' }}>
            <Plant stage={4} vitality={v} species="echeveria" size={56} />
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
              'Finite work with a start & end. Shows a task-driven progress bar, and wilts if left untouched for a week.',
            ],
            [
              'retainer',
              'Retainer',
              'Ongoing upkeep, no end date. Shows cadence & streak instead of a bar; exempt from neglect nudges.',
            ],
            [
              'area',
              'Area',
              'An evergreen home for reference notes. The one type that never wilts — consulting it every few weeks is not neglect.',
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
              <Plant stage={3} vitality="healthy" species={SAMPLE_SPECIES[type]} size={52} />
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
