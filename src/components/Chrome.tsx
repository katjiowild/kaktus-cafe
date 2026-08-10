import { C, NARROW_MAX, WIDE_MAX } from '../tokens';
import { NavIcon, PersonIcon } from './ui';
import type { View } from '../views/types';

/**
 * The five bottom-nav items, in the Phase 2 design's order. More has given up
 * its slot to Focus and now lives behind the header's hamburger.
 *
 * Garden takes the slot Projects used to hold. For now the tab opens the
 * Greenhouse directly — the Garden page it will eventually sit behind isn't
 * built yet, which is also why the Greenhouse has no back chevron.
 */
const NAV: { view: View; label: string; icon: string }[] = [
  { view: 'today', label: 'Today', icon: 'today' },
  { view: 'notes', label: 'Notes', icon: 'notes' },
  { view: 'calendar', label: 'Calendar', icon: 'calendar' },
  { view: 'focus', label: 'Focus', icon: 'focus' },
  { view: 'garden', label: 'Garden', icon: 'garden' },
];

/** Which nav item lights up. Views the menu owns aren't listed — they keep the
 *  tab you came from lit, so the bar never goes dark. */
const GROUP: Partial<Record<View, View>> = {
  today: 'today',
  notes: 'notes',
  calendar: 'calendar',
  focus: 'focus',
  garden: 'garden',
  projectDetail: 'garden',
};

export function BottomNav({
  view,
  fallback,
  wide,
  onGo,
}: {
  view: View;
  /** The tab to keep lit while a menu page is open. */
  fallback: View;
  wide: boolean;
  onGo: (v: View) => void;
}) {
  const base: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    zIndex: 30,
    background: 'rgba(251,249,244,.94)',
    backdropFilter: 'blur(14px)',
    borderTop: `1px solid ${C.line}`,
    display: 'flex',
    padding: '8px 6px 10px',
    paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
  };
  // Wide: the bar flushes to the right edge of the 900px canvas, aligned to the
  // detail pane, rather than stretching across it.
  const style: React.CSSProperties = wide
    ? { ...base, width: NARROW_MAX, right: `calc(max(0px, (100% - ${WIDE_MAX}px)/2))`, left: 'auto' }
    : { ...base, left: 0, right: 0, maxWidth: NARROW_MAX, margin: '0 auto' };

  const active = GROUP[view] ?? fallback;

  return (
    <nav style={style}>
      {NAV.map((n) => {
        const on = active === n.view;
        return (
          <button
            key={n.view}
            onClick={() => onGo(n.view)}
            aria-current={on ? 'page' : undefined}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px 2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: on ? C.deepSage : C.muted,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ display: 'flex' }}>
              <NavIcon name={n.icon} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export type AddKind = 'task' | 'note' | 'project' | 'meeting' | 'person';

const RADIAL: { kind: AddKind; label: string; glyph: React.ReactNode }[] = [
  { kind: 'task', label: 'Task', glyph: '✓' },
  { kind: 'note', label: 'Note', glyph: '✎' },
  { kind: 'project', label: 'Project', glyph: '▤' },
  { kind: 'meeting', label: 'Meeting', glyph: '◷' },
  { kind: 'person', label: 'Person', glyph: <PersonIcon size={16} /> },
];

/** The + fans 5 labelled icons up-and-left along an arc (§2). */
export function RadialMenu({
  open,
  wide,
  onToggle,
  onPick,
}: {
  open: boolean;
  wide: boolean;
  onToggle: () => void;
  onPick: (kind: AddKind) => void;
}) {
  // Below 460px the canvas is narrower than NARROW_MAX, so the old offset went
  // negative and pushed the button half off the right edge — on every phone.
  const fabRight = wide
    ? `calc(max(0px, (100% - ${WIDE_MAX}px)/2) + 22px)`
    : `calc(max(0px, 50% - ${NARROW_MAX / 2}px) + 22px)`;
  const radius = 82;
  const angles = [198, 172, 146, 120, 94];

  return (
    <>
      <div style={{ position: 'fixed', zIndex: 50, bottom: 96, right: fabRight, width: 0, height: 0 }}>
        {RADIAL.map((item, i) => {
          const a = (angles[i] * Math.PI) / 180;
          const x = Math.round(Math.cos(a) * radius);
          const y = Math.round(-Math.sin(a) * radius);
          return (
            <button
              key={item.kind}
              onClick={() => onPick(item.kind)}
              tabIndex={open ? 0 : -1}
              aria-hidden={!open}
              style={{
                position: 'absolute',
                right: 4,
                bottom: 4,
                width: 50,
                height: 50,
                borderRadius: '50%',
                border: `1px solid ${C.cardBorder}`,
                background: C.card,
                color: C.sage,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 18,
                lineHeight: 1,
                boxShadow: '0 4px 14px rgba(36,43,40,.16)',
                transition: 'transform .3s cubic-bezier(.2,.9,.3,1.3), opacity .22s ease',
                transitionDelay: open ? `${i * 0.03}s` : '0s',
                transform: open ? `translate(${x}px,${y}px)` : 'translate(0,0) scale(.3)',
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.glyph}</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.02em' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onToggle}
        aria-label={open ? 'Close add menu' : 'Add something'}
        aria-expanded={open}
        style={{
          position: 'fixed',
          zIndex: 50,
          bottom: 96,
          right: fabRight,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: open ? C.deepSage : C.clay,
          color: '#fff',
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
          boxShadow: '0 6px 18px rgba(181,106,75,.42)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform .3s cubic-bezier(.2,.9,.3,1.3), background .2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0)',
        }}
      >
        +
      </button>
    </>
  );
}

export function Scrim({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: 'rgba(36,43,40,.34)',
        backdropFilter: 'blur(2px)',
        animation: 'sbscrim .2s ease',
      }}
    />
  );
}
