import type { ReactNode } from 'react';
import { C, CARD_SHADOW, SERIF, TYPE_BADGE, TYPE_LABEL, sectionHeader } from '../tokens';
import type { ProjectType } from '../types';

export function Check({ done, size = 12 }: { done: boolean; size?: number }) {
  if (!done) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fff" strokeWidth={3.2}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Checkbox({
  done,
  onClick,
  size = 22,
  radius = 7,
}: {
  done: boolean;
  onClick: () => void;
  size?: number;
  radius?: number;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: radius,
        border: `2px solid ${done ? C.sage : C.line}`,
        background: done ? C.sage : '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Check done={done} size={size * 0.55} />
    </div>
  );
}

export function TypeBadge({ type, label }: { type: ProjectType; label?: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.05em',
        padding: '3px 8px',
        borderRadius: 6,
        textTransform: 'uppercase',
        flexShrink: 0,
        ...TYPE_BADGE[type],
      }}
    >
      {label ?? TYPE_LABEL[type]}
    </span>
  );
}

export function OverdueFlag() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.06em',
        color: '#fff',
        background: C.overdue,
        padding: '3px 7px',
        borderRadius: 5,
      }}
    >
      OVERDUE
    </span>
  );
}

/** Labelled switch row, matching the note-pin toggle already in the sheets. */
export function ToggleRow({
  icon,
  label,
  on,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: C.ink }}>{label}</span>
      <span
        style={{
          width: 40,
          height: 24,
          borderRadius: 12,
          background: on ? C.sage : '#d8d0bf',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: on ? 'flex-end' : 'flex-start',
          transition: 'all .18s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,.2)',
          }}
        />
      </span>
    </div>
  );
}

/** Urgency (v5 §1). Deliberately quieter than OVERDUE — an outline, not a
 *  filled alarm — so a list of urgent things still reads calmly. */
export function UrgentFlag() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.06em',
        color: C.clay,
        background: '#f7ece6',
        border: `1px solid #e6c9bd`,
        padding: '2px 6px',
        borderRadius: 5,
      }}
    >
      URGENT
    </span>
  );
}

/**
 * Which calendar an event came from (v5 §3–4). Google and Outlook get distinct
 * labels and tints; `title` carries the account email so overlapping calendars
 * are still tellable apart on a long press / hover.
 */
export function SourceBadge({
  source,
  account,
}: {
  source: 'local' | 'google' | 'outlook';
  account?: string;
}) {
  if (source === 'local') return null;
  const isGoogle = source === 'google';
  return (
    <span
      title={account ? `${isGoogle ? 'Google' : 'Outlook'} · ${account}` : undefined}
      style={{
        flexShrink: 0,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.04em',
        color: isGoogle ? C.softInk : '#3f5876',
        background: isGoogle ? C.paper2 : '#e6ecf3',
        border: `1px solid ${isGoogle ? C.line : '#cbd8e6'}`,
        padding: '3px 7px',
        borderRadius: 6,
      }}
    >
      {isGoogle ? 'GCAL' : 'OUTLOOK'}
    </span>
  );
}

export function ProjectChip({ name }: { name: string }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 20,
        background: C.paper2,
        color: C.softInk,
      }}
    >
      {name}
    </span>
  );
}

export function SectionHeader({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '20px 2px 10px',
      }}
    >
      <div style={sectionHeader}>{title}</div>
      {meta !== undefined && (
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{meta}</span>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px 20px', color: C.muted, fontSize: 14, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        background: C.deepSage,
        color: C.paper,
        padding: '11px 18px',
        borderRadius: 12,
        fontSize: 13.5,
        fontWeight: 500,
        zIndex: 80,
        maxWidth: '88%',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(36,43,40,.28)',
      }}
    >
      {message}
    </div>
  );
}

// ---------- icons ----------

const NAV_PATHS: Record<string, string> = {
  today: 'M3 12l9-9 9 9 M5 10v10h14V10',
  projects: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  /** A potted succulent — the Garden tab, and the only nav glyph that draws
   *  the thing the page is full of rather than a document or a grid. */
  garden: 'M6.5 14h11l-1.1 6H7.6z M12 14V8 M12 12c0-2.6 1.9-4.6 4.5-4.6 0 2.6-1.9 4.6-4.5 4.6z M12 12.6c0-2.6-1.9-4.6-4.5-4.6 0 2.6 1.9 4.6 4.5 4.6z',
  calendar: 'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4',
  notes: 'M6 3h9l3 3v15H6z M14 3v4h4',
  tasks: 'M9 6h11 M9 12h11 M9 18h11 M4 6l1 1 2-2 M4 12l1 1 2-2 M4 18l1 1 2-2',
  focus: 'M6 8h10v6a5 5 0 01-5 5 5 5 0 01-5-5z M16 9h2a3 3 0 010 6h-2',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  // Menu-row glyphs. Same 24×24, 1.9 stroke, round caps as the nav set —
  // emoji sat outside the drawn language and read as a different app.
  meetings: 'M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4',
  people: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 20c0-4 4-6 8-6s8 2 8 6',
  system: 'M12 3C7 3 3 7 3 12c5 0 9-4 9-9z M3 12c0 5 4 9 9 9',
  archive: 'M4 7h16v13H4z M4 4h16v3H4z M10 11h4',
  flag: 'M6 3v18 M6 4h9l-2 3 2 3H6',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6z M5 12a7 7 0 01.3-2l-1.6-1.3 1.5-2.6 2 .6a7 7 0 011.7-1l.3-2h3l.3 2a7 7 0 011.7 1l2-.6 1.5 2.6L18 10a7 7 0 010 4l1.6 1.3-1.5 2.6-2-.6a7 7 0 01-1.7 1l-.3 2h-3l-.3-2a7 7 0 01-1.7-1l-2 .6-1.5-2.6L5 14a7 7 0 01-.3-2z',
};

/** Map-pin, for a meeting's location. Drawn, not the 📍 emoji, which rendered
 *  in full colour and broke the line-icon language everywhere it appeared. */
export function LocationIcon({ size = 13, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  );
}

export function FlameIcon({ size = 15, color = C.clay }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 3c3 4 6 5.5 6 9a6 6 0 01-12 0c0-2 1-3.5 2.5-5 .3 1.2 1 2 2 2.3C10 7 11 4.5 12 3z" />
    </svg>
  );
}

export function HamburgerIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function NavIcon({ name, size = 22 }: { name: string; size?: number }) {
  const segments = NAV_PATHS[name].split(' M');
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {segments.map((seg, i) => (
        <path key={i} d={(i ? 'M' : '') + seg} />
      ))}
    </svg>
  );
}

export function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4-4" />
    </svg>
  );
}

export function PencilIcon({ size = 16, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function PinIcon({
  pinned,
  size = 16,
  color = C.sage,
}: {
  pinned: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={pinned ? color : 'none'}
      stroke={pinned ? color : C.muted}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76V4h6v6.76a2 2 0 0 0 .59 1.41l1.7 1.7A1 1 0 0 1 16.59 16H7.4a1 1 0 0 1-.7-1.71l1.7-1.7A2 2 0 0 0 9 10.76z" />
    </svg>
  );
}

export function PersonIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
      <circle cx={12} cy={8} r={4} />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
    </svg>
  );
}

/**
 * One colour for everyone. The design cycled three palette colours by list
 * position, but it signified nothing — and once People became sortable, a
 * positional colour would shift as you re-sort and disagree with the person's
 * own detail page. Rather than keep a meaningless variable and work to make it
 * stable, it's gone: gold, always.
 */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        // Gold is light; dark ink keeps the initial legible.
        color: '#3a2f10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: SERIF,
        fontSize: size * 0.37,
        fontWeight: 600,
        background: C.gold,
      }}
    >
      {(name.trim()[0] || '?').toUpperCase()}
    </div>
  );
}

export function Card({
  children,
  style,
  onClick,
  accent,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        ...(accent ? { borderLeft: `4px solid ${accent}` } : {}),
        borderRadius: 14,
        boxShadow: CARD_SHADOW,
        padding: '14px 15px',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Fingerprint, for the biometric unlock toggle. Same 24×24 line set. */
export function FingerprintIcon({ size = 17, color = C.sage }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M12 11v3a9 9 0 0 1-.6 3.2" />
      <path d="M8.5 10.5a3.5 3.5 0 0 1 7 0v2a12 12 0 0 1-.8 4.3" />
      <path d="M5.5 13v-2a6.5 6.5 0 0 1 13 0v2a15 15 0 0 1-.7 4.6" />
      <path d="M3 9a9.5 9.5 0 0 1 16-2" />
    </svg>
  );
}
