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

/**
 * The detail-page tab strip. Project and Person both use it, so the two pages
 * can't drift apart the way they would with the markup copied into each.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 22,
        marginTop: 18,
        borderBottom: `1px solid ${C.cardBorder}`,
      }}
    >
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={on ? 'page' : undefined}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${on ? C.deepSage : 'transparent'}`,
              padding: '0 0 9px',
              marginBottom: -1,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              color: on ? C.ink : C.muted,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** The serif sub-heading used inside a tab panel. */
export function TabHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, margin: '18px 0 8px' }}>
      {children}
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

/**
 * The drawn icon set.
 *
 * Geometry for today, notes, calendar, focus, garden, projects and tasks comes
 * verbatim from the kaktus-cafe-icon-pack SVGs. The pack ships each of those as
 * a default/active pair, but the two differ only in stroke colour — and NavIcon
 * already takes its colour from the caller via currentColor — so only one copy
 * of each shape is needed here.
 *
 * The remaining seven are drawn to match: same 24×24 grid, same 1.7 rounded
 * stroke, same habit of building a glyph from a couple of plain shapes. They
 * cover the menu rows and project detail, which the pack has no icons for.
 *
 * Values are nodes rather than path strings because several pack icons are
 * built from <rect>, which the old string table couldn't express.
 */
const CALENDAR = (
  <>
    <rect x={3.5} y={4.5} width={17} height={17} rx={3} />
    <path d="M8 2.5v4M16 2.5v4" />
    <path d="M3.5 9.2h17" />
    <path d="M8 13.2h.01M12 13.2h.01M16 13.2h.01M8 16.8h.01M12 16.8h.01" />
  </>
);

const NAV_ICONS: Record<string, React.ReactNode> = {
  // ---- from the icon pack ----
  today: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  /** A notepad: two binding tabs over the top edge, three ruled lines, no
   *  header rule — that last one is what keeps it apart from calendar, which
   *  is otherwise the same rounded rect with the same two tabs. */
  notes: (
    <>
      <rect x={4} y={4.4} width={16.2} height={16.8} rx={2.6} />
      <path d="M8 2.5v3.8M15.7 2.5v3.8" />
      <path d="M7.9 9.8h8.1M7.9 13.1h8.1M7.9 16.3h4.7" />
    </>
  ),
  calendar: CALENDAR,
  /** Meetings shows the calendar too. It used to carry a clock in the corner to
   *  tell the two apart, but that was drawn against the old squarer calendar
   *  and read as a leftover once this one landed. */
  meetings: CALENDAR,
  focus: (
    <>
      <path d="M3 8.6h16" />
      <path d="M3 8.6c.3 5.2 1.6 8.8 3.8 10.1 1.2.5 2.7.8 4.2.8s3-.3 4.2-.8c2.2-1.3 3.5-4.9 3.8-10.1" />
      <path d="M18.9 10.3c2.2 0 3.3 1.2 3.2 2.8-.1 1.7-1.6 2.8-3.8 3.1" />
      <path d="M5.8 10.7c-.3 1.8-.1 3.4.5 4.9" />
      <path d="M3.6 19.7h16.2M6.5 21.8h10.7" />
      <path d="M9.4 7c-.9-1.1.9-2.1 0-3.5M12 7.1c-1-1.3 1-2.4 0-5" />
    </>
  ),
  /**
   * A three-leaf sprout on a bowed stem — the pack's top-nav Greenhouse mark.
   * Each leaf is two circular arcs meeting at a point, plus a midrib.
   *
   * The leaves are drawn fuller than the reference sheet's. That sheet renders
   * at roughly a 0.6 stroke on this grid, where a slim leaf still shows daylight
   * either side of its midrib; at the 1.7 this app draws, the same outline
   * closes up and the leaf reads as a solid blob. These radii keep about a unit
   * of open channel down each side of every midrib.
   */
  garden: (
    <>
      <path d="M11.1 21.6c-.2-3.9.1-7.6.5-10.6" />
      <path d="M10.7 11.2A6.8 6.8 0 0 1 17.8 2.5 6.8 6.8 0 0 1 10.7 11.2Z" />
      <path d="M10.7 11.2 17.8 2.5" />
      <path d="M9.7 17.2A6.2 6.2 0 0 1 4.4 8.4 6.2 6.2 0 0 1 9.7 17.2Z" />
      <path d="M9.7 17.2 4.4 8.4" />
      <path d="M11.5 19.6A5.9 5.9 0 0 1 19.6 14.2 5.9 5.9 0 0 1 11.5 19.6Z" />
      <path d="M11.5 19.6 19.6 14.2" />
    </>
  ),
  projects: (
    <>
      <rect x={4} y={4} width={6} height={6} rx={1} />
      <rect x={14} y={4} width={6} height={6} rx={1} />
      <rect x={4} y={14} width={6} height={6} rx={1} />
      <rect x={14} y={14} width={6} height={6} rx={1} />
    </>
  ),
  /** The box is deliberately unclosed at the top right — the tick breaks out
   *  through the gap rather than being contained by it. */
  tasks: (
    <>
      <path d="M17 3.5H6A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-8" />
      <path d="m8.2 11.7 3.3 3.3L21.6 4.1" />
    </>
  ),

  // ---- drawn to match, for the slots the pack doesn't cover ----
  people: (
    <>
      <circle cx={12} cy={8.5} r={3.5} />
      <path d="M5 20c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5" />
    </>
  ),
  /** A palette, for Visual system — the page about plants, types and colour. */
  system: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.6-.7 1.6-1.5 0-1.3-.9-1.6-.9-2.5 0-.8.6-1.4 1.4-1.4h1.4a4.5 4.5 0 0 0 4.5-4.5c0-4-3.8-7.1-8-7.1Z" />
      <path d="M8 10h.01M11 7.5h.01M15 8.5h.01M6.5 13.5h.01" />
    </>
  ),
  archive: (
    <>
      <rect x={3} y={4} width={18} height={4} rx={1.5} />
      <path d="M5 8v11.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8" />
      <path d="M10 12h4" />
    </>
  ),
  flag: (
    <>
      <path d="M6 3v18" />
      <path d="M6 4.5h11l-2.2 3.5L17 11.5H6z" />
    </>
  ),
  /** Sliders, not a gear. A gear at the menu's 20px needs teeth finer than the
   *  pack's 1.7 stroke can draw, and what survives reads as a sun. */
  settings: (
    <>
      <path d="M4 7h9.5M18.5 7H20" />
      <path d="M4 12h3.5M12.5 12H20" />
      <path d="M4 17h8.5M17.5 17H20" />
      <circle cx={16} cy={7} r={2} />
      <circle cx={10} cy={12} r={2} />
      <circle cx={15} cy={17} r={2} />
    </>
  ),
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
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
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {NAV_ICONS[name]}
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
