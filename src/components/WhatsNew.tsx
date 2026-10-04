import { C, primaryBtn } from '../tokens';
import { SheetShell } from './Sheet';
import type { ChangelogEntry } from '../lib/changelog';

/**
 * One-time "what's new" popup. Shown when the stored `lastSeenChangelogId`
 * setting doesn't match the latest entry in lib/changelog.ts — see App.tsx.
 * Dismissing it (button or backdrop) marks the entry seen either way, same
 * as closing any other sheet counts as acknowledging it.
 */
export function WhatsNew({
  entry,
  wide,
  onDismiss,
}: {
  entry: ChangelogEntry;
  wide: boolean;
  onDismiss: () => void;
}) {
  return (
    <SheetShell title="What's new" onClose={onDismiss} wide={wide}>
      <div style={{ fontSize: 14, color: C.softInk, lineHeight: 1.5, marginTop: 4 }}>
        {entry.intro}
      </div>

      <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none' }}>
        {entry.bullets.map((b, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              fontSize: 14,
              color: C.ink,
              lineHeight: 1.5,
              marginTop: i === 0 ? 0 : 12,
            }}
          >
            <span style={{ color: C.clay, flexShrink: 0 }}>•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div style={{ fontSize: 14, color: C.softInk, lineHeight: 1.5, marginTop: 16 }}>
        {entry.outro}
      </div>

      <div style={{ fontSize: 14, color: C.ink, fontStyle: 'italic', marginTop: 14 }}>
        {entry.signoff}
      </div>

      <button onClick={onDismiss} style={{ ...primaryBtn, marginTop: 22 }}>
        Got it
      </button>
    </SheetShell>
  );
}
