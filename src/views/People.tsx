import { C, dashedBtn, SERIF } from '../tokens';
import { useStore } from '../store';
import { shortDate } from '../lib/dates';
import { Avatar, Card, EmptyState, PencilIcon, SectionHeader } from '../components/ui';
import type { ViewProps } from './types';

export function People({ wide, openPerson, openSheet }: ViewProps) {
  const { people } = useStore();

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginTop: 6,
        ...(wide
          ? { flex: '0 0 40%', maxWidth: '40%', position: 'sticky', top: 4, alignSelf: 'flex-start' }
          : {}),
      }}
    >
      {people.map((p, i) => (
        <Card
          key={p.id}
          onClick={() => openPerson(p.id)}
          style={{ padding: '13px 15px', display: 'flex', gap: 13, alignItems: 'center' }}
        >
          <Avatar name={p.name} index={i} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
            {p.role && (
              <div style={{ fontSize: 12.5, color: C.softInk, marginTop: 2 }}>{p.role}</div>
            )}
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              {p.log.length ? `Last: ${shortDate(p.log[0].at)}` : 'No interactions yet'}
            </div>
          </div>
          {p.followUp && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.04em',
                color: C.clay,
                background: '#f3e6df',
                padding: '3px 8px',
                borderRadius: 20,
              }}
            >
              FOLLOW UP
            </span>
          )}
        </Card>
      ))}
      {people.length === 0 && (
        <EmptyState>No one here yet. Tap + to add someone you've met.</EmptyState>
      )}
      {!wide && people.length > 0 && (
        <button onClick={() => openSheet({ type: 'person' })} style={{ ...dashedBtn, marginTop: 2 }}>
          ＋ Add a person
        </button>
      )}
    </div>
  );
}

export function PersonDetail({ wide, activePersonId, openSheet }: ViewProps) {
  const store = useStore();
  const { people, meetings } = store;
  const person = people.find((p) => p.id === activePersonId);
  const index = people.findIndex((p) => p.id === activePersonId);

  if (!person) {
    return (
      <div
        style={{
          flex: '1 1 60%',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 340,
          color: C.muted,
          fontSize: 14,
          border: `1px dashed ${C.line}`,
          borderRadius: 16,
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        Select a person to open their profile
      </div>
    );
  }

  // Meetings this person is linked to — a live relationship, not a kept list.
  const theirMeetings = meetings
    .filter((m) => m.personIds.includes(person.id))
    .sort((a, b) => b.datetime.localeCompare(a.datetime));

  return (
    <div
      style={{
        animation: 'sbfade .3s ease',
        ...(wide ? { flex: '1 1 60%', minWidth: 0 } : {}),
      }}
    >
      <div
        style={{
          position: 'relative',
          background: C.card,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(36,43,40,.05), 0 6px 18px rgba(36,43,40,.05)',
          padding: 18,
          display: 'flex',
          gap: 15,
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => openSheet({ type: 'person', personId: person.id })}
          aria-label="Edit person"
          title="Edit person"
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
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
        <Avatar name={person.name} index={index} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500 }}>{person.name}</div>
          {person.role && (
            <div style={{ fontSize: 13, color: C.softInk, marginTop: 3 }}>{person.role}</div>
          )}
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
            How we met: {person.howMet || '—'}
          </div>
        </div>
      </div>

      <button
        onClick={() => void store.updatePerson(person.id, { followUp: !person.followUp })}
        style={{
          width: '100%',
          marginTop: 12,
          background: person.followUp ? '#f3e6df' : C.card,
          color: person.followUp ? C.clay : C.softInk,
          border: `1px solid ${person.followUp ? '#e6c9bd' : C.line}`,
          borderRadius: 12,
          padding: 12,
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {person.followUp ? '✓ Following up' : '＋ Flag for follow-up'}
      </button>

      <SectionHeader title="Interaction log" meta={String(person.log.length)} />
      <button
        onClick={() =>
          openSheet({
            type: 'mini',
            kind: 'log',
            ctx: person.id,
            title: 'Log an interaction',
            label: 'What did you discuss?',
            placeholder: 'e.g. Agreed on next steps…',
          })
        }
        style={{ ...dashedBtn, marginBottom: 12, padding: '12px 14px' }}
      >
        ＋ Log an interaction
      </button>

      {person.log.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div
            style={{
              position: 'absolute',
              left: 5,
              top: 6,
              bottom: 6,
              width: 2,
              background: '#e2dbc9',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {person.log.map((l) => (
              <div key={l.id} style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: -19,
                    top: 4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: C.sage,
                    border: `2px solid ${C.paper}`,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    fontWeight: 600,
                    letterSpacing: '.02em',
                  }}
                >
                  {shortDate(l.at)}
                </div>
                <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5, marginTop: 3 }}>
                  {l.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {theirMeetings.length > 0 && (
        <>
          <SectionHeader title="Meetings" meta={String(theirMeetings.length)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {theirMeetings.map((m) => (
              <div
                key={m.id}
                onClick={() => openSheet({ type: 'meeting', meetingId: m.id })}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  padding: '12px 13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 14, flex: 1 }}>{m.title}</span>
                <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
                  {shortDate(m.datetime)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
