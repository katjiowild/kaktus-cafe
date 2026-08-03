import { useState } from 'react';
import { ACCENT, C, dashedBtn, SERIF } from '../tokens';
import { useStore } from '../store';
import { shortDate } from '../lib/dates';
import { Avatar, Card, EmptyState, PencilIcon, SectionHeader, TypeBadge } from '../components/ui';
import type { ViewProps } from './types';
import { Linkify } from '../components/Linkify';

type PeopleSort = 'name' | 'updated';

export function People({ wide, openPerson, openSheet }: ViewProps) {
  const { people, notes, meetings } = useStore();

  // Sort and filter are independent: either can be used alone or together.
  const [sort, setSort] = useState<PeopleSort>('name');
  const [followUpOnly, setFollowUpOnly] = useState(false);

  /** Most recent contact, derived from linked notes and meetings. */
  const lastContact = (personId: string): string | null => {
    const dates = [
      ...notes.filter((n) => n.personIds.includes(personId)).map((n) => n.date),
      ...meetings
        .filter((m) => m.personIds.includes(personId))
        .map((m) => m.datetime.slice(0, 10)),
    ].sort();
    return dates.length ? dates[dates.length - 1] : null;
  };

  const shown = people
    .filter((p) => !followUpOnly || p.followUp)
    .slice()
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        : b.updatedAt.localeCompare(a.updatedAt),
    );

  const followUpCount = people.filter((p) => p.followUp).length;

  const controlRow: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    margin: '0 2px 2px',
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
      {people.length > 0 && (
        <div style={controlRow}>
          {/* Sort — one of two, always active */}
          <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="Sort people">
            <button
              onClick={() => setSort('name')}
              aria-pressed={sort === 'name'}
              style={chip(sort === 'name')}
            >
              A–Z
            </button>
            <button
              onClick={() => setSort('updated')}
              aria-pressed={sort === 'updated'}
              style={chip(sort === 'updated')}
            >
              Recently updated
            </button>
          </div>

          {/* Filter — independent of the sort above */}
          <button
            onClick={() => setFollowUpOnly((f) => !f)}
            aria-pressed={followUpOnly}
            style={{
              ...chip(followUpOnly),
              marginLeft: 'auto',
              ...(followUpOnly
                ? {}
                : { borderColor: '#e6c9bd', color: C.clay, background: C.card }),
            }}
          >
            Follow-up{followUpCount > 0 ? ` (${followUpCount})` : ''}
          </button>
        </div>
      )}

      {shown.map((p) => (
        <Card
          key={p.id}
          onClick={() => openPerson(p.id)}
          style={{ padding: '13px 15px', display: 'flex', gap: 13, alignItems: 'center' }}
        >
          <Avatar name={p.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
            {p.role && (
              <div style={{ fontSize: 12.5, color: C.softInk, marginTop: 2 }}>{p.role}</div>
            )}
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              {lastContact(p.id) ? `Last: ${shortDate(lastContact(p.id)!)}` : 'Nothing logged yet'}
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
      {people.length > 0 && shown.length === 0 && (
        <EmptyState>No one is flagged for follow-up right now.</EmptyState>
      )}
      {!wide && people.length > 0 && (
        <button onClick={() => openSheet({ type: 'person' })} style={{ ...dashedBtn, marginTop: 2 }}>
          ＋ Add a person
        </button>
      )}
    </div>
  );
}

export function PersonDetail({ wide, activePersonId, openSheet, openProject }: ViewProps) {
  const store = useStore();
  const { people, meetings, notes, projects } = store;
  const person = people.find((p) => p.id === activePersonId);

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

  // Everything connected to this person, read live off the relationships (v5 §2).
  const theirMeetings = meetings
    .filter((m) => m.personIds.includes(person.id))
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
  const theirNotes = notes
    .filter((n) => n.personIds.includes(person.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  const theirProjects = projects.filter((p) => person.projectIds.includes(p.id));

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
        <Avatar name={person.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500 }}>{person.name}</div>
          {person.role && (
            <div style={{ fontSize: 13, color: C.softInk, marginTop: 3 }}>
              <Linkify text={person.role} />
            </div>
          )}
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
            How we met: {person.howMet ? <Linkify text={person.howMet} /> : '—'}
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

      {theirProjects.length > 0 && (
        <>
          <SectionHeader title="Projects" meta={String(theirProjects.length)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {theirProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => openProject(p.id)}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderLeft: `4px solid ${ACCENT[p.type]}`,
                  borderRadius: 12,
                  padding: '12px 13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0 }}>{p.name}</span>
                <TypeBadge type={p.type} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notes replace the old interaction log: same running history, but each
          entry is a real note that also shows in Notes and can carry a project
          or meeting. */}
      <>
          <SectionHeader title="Notes" meta={String(theirNotes.length)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {theirNotes.map((n) => (
              <div
                key={n.id}
                onClick={() => openSheet({ type: 'note', noteId: n.id })}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  padding: '12px 13px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.softInk,
                    lineHeight: 1.45,
                    marginTop: 4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  <Linkify text={n.body} />
                </div>
              </div>
            ))}
            <button
              onClick={() => openSheet({ type: 'note', personId: person.id })}
              style={dashedBtn}
            >
              ＋ Add a note
            </button>
          </div>
        </>

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
