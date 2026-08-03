import { useMemo, useRef, useState } from 'react';
import { C, input, label as labelStyle } from '../tokens';
import { useStore } from '../store';
import { Avatar } from './ui';

/**
 * The one "pick a person" control (v5 §2) — autocomplete over existing People,
 * multi-select. Used by the Meeting, Note and Project sheets so linking works
 * the same way everywhere.
 *
 * It only ever selects people who already exist; creating a person is its own
 * deliberate act via the + menu, so a typo can't quietly spawn a duplicate CRM
 * entry from three different forms.
 */
export function PersonPicker({
  selected,
  onChange,
  label = 'People',
  hint,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  hint?: string;
}) {
  const { people } = useStore();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);

  const chosen = selected
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => !selected.includes(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q))
      .slice(0, 6);
  }, [people, selected, query]);

  const add = (id: string) => {
    onChange([...selected, id]);
    setQuery('');
  };

  return (
    <div>
      <label style={labelStyle}>{label}</label>

      {chosen.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {chosen.map((p) => (
            <span
              key={p.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: C.paper2,
                border: `1px solid ${C.line}`,
                borderRadius: 20,
                padding: '5px 6px 5px 10px',
                fontSize: 13,
                fontWeight: 600,
                color: C.ink,
              }}
            >
              {p.name}
              <button
                onClick={() => onChange(selected.filter((id) => id !== p.id))}
                aria-label={`Remove ${p.name}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                  padding: '0 2px',
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            window.clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          // Delay so a click on a suggestion lands before the list unmounts.
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setFocused(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches.length > 0) {
              e.preventDefault();
              add(matches[0].id);
            }
          }}
          placeholder={people.length === 0 ? 'No people yet — add one from +' : 'Type a name…'}
          style={input}
        />

        {focused && matches.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 12,
              boxShadow: '0 6px 18px rgba(36,43,40,.12)',
              overflow: 'hidden',
              zIndex: 5,
            }}
          >
            {matches.map((p) => (
              <div
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 11px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${C.paper2}`,
                }}
              >
                <Avatar name={p.name} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{p.name}</div>
                  {p.role && (
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{p.role}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}
