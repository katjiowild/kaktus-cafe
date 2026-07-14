// Design tokens — exact values from the design package. Single source; nothing
// in the app should hardcode a hex.

export const C = {
  paper: '#f4f1e9',
  paper2: '#ece7db',
  card: '#fbf9f4',
  cardBorder: '#e7e1d3',
  ink: '#242b28',
  softInk: '#5b665f',
  muted: '#8b948d',
  sage: '#3f5348',
  deepSage: '#2c3a34',
  clay: '#b56a4b',
  clayDark: '#9a5740',
  gold: '#c99a3f',
  line: '#ddd6c6',
  nudgeBg: '#f3ead0',
  nudgeBorder: '#e8dbb4',
  nudgeInk: '#94701c',
  /** OVERDUE flag. The prototype uses #c0492e throughout; the README table's
   *  #b23b2e appears only there, so the code wins. */
  overdue: '#c0492e',
  overdueBorder: '#e8c4b8',
  dashed: '#d2c9b3',
} as const;

/** Project type → accent. Matches the prototype (retainer = clay, area = gold);
 *  the README's colour table has these two swapped. */
export const ACCENT: Record<string, string> = {
  active: C.sage,
  retainer: C.clay,
  area: C.gold,
};

export const TYPE_BADGE: Record<string, { background: string; color: string }> = {
  active: { background: '#e3ecdf', color: '#4a6b52' },
  retainer: { background: '#f3e6df', color: C.clay },
  area: { background: '#f3ead0', color: C.nudgeInk },
};

export const TYPE_LABEL: Record<string, string> = {
  active: 'Active',
  retainer: 'Retainer',
  area: 'Area',
};

export const SERIF = "'Fraunces', serif";

export const CARD_SHADOW = '0 1px 2px rgba(36,43,40,.05), 0 4px 14px rgba(36,43,40,.04)';
export const CARD_SHADOW_LG = '0 1px 2px rgba(36,43,40,.05), 0 6px 18px rgba(36,43,40,.05)';

/** The fold is the breakpoint. */
export const WIDE_BREAKPOINT = 720;
export const NARROW_MAX = 460;
export const WIDE_MAX = 900;

export const card: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.cardBorder}`,
  borderRadius: 14,
  boxShadow: CARD_SHADOW,
};

export const sectionHeader: React.CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  fontSize: 19,
};

export const primaryBtn: React.CSSProperties = {
  width: '100%',
  background: C.clay,
  color: '#fff',
  border: 'none',
  borderRadius: 13,
  padding: 15,
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
};

export const dashedBtn: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: `1px dashed ${C.dashed}`,
  borderRadius: 12,
  padding: '11px 13px',
  color: C.clay,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

export const input: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${C.line}`,
  background: C.card,
  borderRadius: 11,
  padding: '12px 13px',
  fontFamily: 'inherit',
  fontSize: 15,
  color: C.ink,
  outline: 'none',
};

export const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: C.softInk,
  marginBottom: 6,
};

export const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 5,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  lineHeight: 0,
};

export const pill = (on: boolean): React.CSSProperties => ({
  border: `1px solid ${on ? C.deepSage : C.line}`,
  background: on ? C.deepSage : C.card,
  color: on ? C.paper : C.softInk,
  borderRadius: 10,
  padding: '10px 12px',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  flex: 1,
  minWidth: 56,
});
