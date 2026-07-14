import type { ProjectType } from '../types';
import type { Vitality } from '../lib/derive';

/**
 * The succulent — a pure function of (stage, vitality, species, size) → SVG.
 * Ported from the design package's Plant.dc.html; palettes and geometry are
 * unchanged.
 *
 * Two independent dimensions (§5.2):
 *   stage 1–5  = size/fullness, from progress. Never reduced by neglect.
 *   vitality   = colour, from days since activity. Reviving restores colour
 *                without losing stage.
 *
 * Species by project type: active = echeveria, retainer = aeonium,
 * area = dracaena.
 */

type Palette = { deep: string; mid: string; light: string; tip: string };

const PAL: Record<ProjectType, Record<Vitality, Palette>> = {
  active: {
    // echeveria — blue-green rosette, rosy tips
    healthy: { deep: '#3f6b57', mid: '#75a086', light: '#a6c9a8', tip: '#e0a9a0' },
    dry: { deep: '#5c6440', mid: '#8a9264', light: '#b6bd8c', tip: '#cdb583' },
    yellowing: { deep: '#8a7332', mid: '#c2a24d', light: '#ddc272', tip: '#e6d495' },
    browning: { deep: '#6f4a30', mid: '#9a6b48', light: '#bb8b63', tip: '#c9a681' },
  },
  retainer: {
    // aeonium — deep green rosettes, burgundy edge
    healthy: { deep: '#33203c', mid: '#6d3f6b', light: '#915f8a', tip: '#c98fb4' },
    dry: { deep: '#47502e', mid: '#727d45', light: '#9aa564', tip: '#8a5a48' },
    yellowing: { deep: '#786a2c', mid: '#b39730', light: '#d3bd5c', tip: '#b78a3e' },
    browning: { deep: '#5a3d26', mid: '#875d3d', light: '#a67d56', tip: '#7a4432' },
  },
  area: {
    // dracaena — spiky fountain, red-orange edges
    healthy: { deep: '#3a5f43', mid: '#5f9058', light: '#8bb56f', tip: '#c66a34' },
    dry: { deep: '#525d3c', mid: '#7d8a50', light: '#a6b06b', tip: '#bd8a44' },
    yellowing: { deep: '#786a2e', mid: '#bda23c', light: '#d8c25c', tip: '#c99a3f' },
    browning: { deep: '#5a3f28', mid: '#8a603c', light: '#a98056', tip: '#8a4a2c' },
  },
};

const leaf = (len: number, wid: number, tip = 0) =>
  `M0 0 C ${-wid} ${-len * 0.45}, ${-wid * 0.45} ${-len}, ${tip} ${-len} ` +
  `C ${wid * 0.45} ${-len}, ${wid} ${-len * 0.45}, 0 0 Z`;

const ECHEVERIA_RINGS: Record<number, { len: number; wid: number; n: number }[]> = {
  1: [{ len: 18, wid: 10, n: 6 }],
  2: [
    { len: 24, wid: 12, n: 8 },
    { len: 15, wid: 9, n: 5 },
  ],
  3: [
    { len: 28, wid: 13, n: 9 },
    { len: 18, wid: 10, n: 6 },
  ],
  4: [
    { len: 31, wid: 14, n: 10 },
    { len: 20, wid: 11, n: 7 },
    { len: 12, wid: 8, n: 5 },
  ],
  5: [
    { len: 33, wid: 14, n: 11 },
    { len: 22, wid: 11, n: 8 },
    { len: 13, wid: 8, n: 5 },
  ],
};

export interface PlantProps {
  stage: number;
  vitality: Vitality;
  species: ProjectType;
  size?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
  title?: string;
}

export function Plant({ stage, vitality, species, size = 76, onClick, style, title }: PlantProps) {
  const st = Math.max(1, Math.min(5, Math.round(stage)));
  const c = PAL[species][vitality];
  const groupOp = vitality === 'browning' ? 0.9 : vitality === 'yellowing' ? 0.97 : 1;
  const kids: React.ReactNode[] = [];
  let ki = 0;
  const path = (d: string, attrs: React.SVGProps<SVGPathElement>) =>
    kids.push(<path key={`p${ki++}`} d={d} {...attrs} />);

  kids.push(<ellipse key="sh" cx={50} cy={103} rx={20} ry={3.4} fill="rgba(40,38,26,.13)" />);

  if (species === 'active') {
    const cx = 50;
    const cy = 74;
    const fills = [c.mid, c.light, c.tip];
    ECHEVERIA_RINGS[st].forEach((ring, ri) => {
      const fill = fills[Math.min(ri, fills.length - 1)];
      for (let i = 0; i < ring.n; i++) {
        const ang = i * (360 / ring.n) + ri * 20;
        path(leaf(ring.len, ring.wid), {
          fill,
          stroke: c.deep,
          strokeWidth: 0.5,
          transform: `translate(${cx} ${cy}) rotate(${ang})`,
        });
      }
    });
    kids.push(
      <circle key="bud" cx={cx} cy={cy - 2} r={3.4} fill={c.tip} stroke={c.deep} strokeWidth={0.5} />,
    );
    if (st === 5) kids.push(<circle key="bloom" cx={cx} cy={cy - 2} r={1.6} fill="#f2d9a0" />);
  } else if (species === 'retainer') {
    const count = st <= 1 ? 1 : st <= 3 ? 2 : 3;
    const spots = [
      { x: 50, y: 56, s: 1 },
      { x: 33, y: 70, s: 0.74 },
      { x: 66, y: 66, s: 0.66 },
    ].slice(0, count);

    spots.forEach((sp) => {
      const midx = (50 + sp.x) / 2 + (sp.x - 50) * 0.25;
      const midy = (101 + sp.y) / 2;
      path(`M50 101 Q ${midx} ${midy} ${sp.x} ${sp.y}`, {
        fill: 'none',
        stroke: c.deep,
        strokeWidth: 3.4 * sp.s,
        strokeLinecap: 'round',
      });
    });
    spots.forEach((sp) => {
      const n = 13;
      const len = 15 * sp.s;
      const wid = 3.4 * sp.s;
      for (let i = 0; i < n; i++) {
        const ang = i * (360 / n);
        path(leaf(len, wid), {
          fill: c.mid,
          stroke: c.tip,
          strokeWidth: 0.6,
          transform: `translate(${sp.x} ${sp.y}) rotate(${ang})`,
        });
      }
      kids.push(<circle key={`ac${sp.x}`} cx={sp.x} cy={sp.y} r={3.2 * sp.s} fill={c.deep} />);
    });
    if (st === 5) {
      const sp = spots[0];
      kids.push(<circle key="ab" cx={sp.x} cy={sp.y - 1} r={1.8} fill={c.tip} />);
    }
  } else {
    const crowns = [{ x: 50, y: 54, s: 1 }];
    if (st >= 4) crowns.push({ x: 62, y: 66, s: 0.7 });
    if (st >= 5) crowns.push({ x: 40, y: 64, s: 0.66 });
    crowns.forEach((cr) => {
      path(`M50 101 Q ${(50 + cr.x) / 2} ${(101 + cr.y) / 2 + 6} ${cr.x} ${cr.y}`, {
        fill: 'none',
        stroke: c.deep,
        strokeWidth: 3.6 * cr.s,
        strokeLinecap: 'round',
      });
      const n = 7 + st * 2;
      const dlen = (30 + st * 3.2) * cr.s;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const ang = -102 + 204 * t;
        const len = dlen * (0.72 + 0.28 * Math.cos((ang * Math.PI) / 180));
        const fill = i % 3 === 0 ? c.light : c.mid;
        path(leaf(len, 3.1 * cr.s), {
          fill,
          stroke: c.tip,
          strokeWidth: 0.45,
          transform: `translate(${cr.x} ${cr.y}) rotate(${ang})`,
        });
      }
    });
    if (st === 5) {
      path('M50 54 L50 30', { fill: 'none', stroke: c.deep, strokeWidth: 1.4 });
      [30, 36, 42].forEach((y, i) =>
        kids.push(<circle key={`db${i}`} cx={50} cy={y} r={2} fill={c.tip} />),
      );
    }
  }

  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        width: size,
        height: size * 1.08,
        display: 'inline-block',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 100 108"
        width={size}
        height={size * 1.08}
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={`${species} plant, growth stage ${st}, ${vitality}`}
      >
        <g opacity={groupOp}>{kids}</g>
      </svg>
    </div>
  );
}
