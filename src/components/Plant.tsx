import type { ProjectType } from '../types';
import type { Vitality } from '../lib/derive';

/**
 * The succulent — a pure function of (stage, vitality, species, size).
 *
 * Two independent dimensions (§5.2):
 *   stage 1–5  = size/fullness, from progress. Never reduced by neglect.
 *   vitality   = colour, from days since activity. Reviving restores colour
 *                without losing stage.
 *
 * Species by project type: active = echeveria, retainer = aeonium,
 * area = dracaena.
 *
 * Echeveria and aeonium are the Phase 2 illustrations, one file per level and
 * vitality state. Dracaena has no illustration in that set, so areas keep the
 * drawn SVG below — which costs nothing in practice, since areas are always
 * healthy and sit at a fixed stage.
 */

/** Four illustrated levels against five growth stages: the top two share one. */
const ILLUSTRATED: Partial<Record<ProjectType, string>> = {
  active: 'echeveria',
  retainer: 'aeonium',
};

/**
 * The illustrations come in two states, not four. That matches how the rest of
 * the app reads vitality — `needsWater` is yellowing-or-worse — so the split
 * lands in the same place as the Today nudge and the neglect banner.
 */
function illustrationFor(species: ProjectType, stage: number, vitality: Vitality): string | null {
  const name = ILLUSTRATED[species];
  if (!name) return null;
  const level = Math.max(1, Math.min(4, Math.round(stage)));
  const state = vitality === 'yellowing' || vitality === 'browning' ? 'neglected' : 'healthy';
  return `${import.meta.env.BASE_URL}succulents/${name}-l${level}-${state}.png`;
}

type Palette = { deep: string; mid: string; light: string; tip: string };

/** Dracaena only — the other two species are illustrations now. */
const DRACAENA: Record<Vitality, Palette> = {
  healthy: { deep: '#3a5f43', mid: '#5f9058', light: '#8bb56f', tip: '#c66a34' },
  dry: { deep: '#525d3c', mid: '#7d8a50', light: '#a6b06b', tip: '#bd8a44' },
  yellowing: { deep: '#786a2e', mid: '#bda23c', light: '#d8c25c', tip: '#c99a3f' },
  browning: { deep: '#5a3f28', mid: '#8a603c', light: '#a98056', tip: '#8a4a2c' },
};

const leaf = (len: number, wid: number, tip = 0) =>
  `M0 0 C ${-wid} ${-len * 0.45}, ${-wid * 0.45} ${-len}, ${tip} ${-len} ` +
  `C ${wid * 0.45} ${-len}, ${wid} ${-len * 0.45}, 0 0 Z`;

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
  const art = illustrationFor(species, st, vitality);

  if (art) {
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
        <img
          src={art}
          alt={`${species} plant, growth stage ${st}, ${vitality}`}
          // contain, never crop — the pot and the bloom both matter, and the
          // illustrations aren't all the same aspect ratio.
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>
    );
  }

  const c = DRACAENA[vitality];
  const groupOp = vitality === 'browning' ? 0.9 : vitality === 'yellowing' ? 0.97 : 1;
  const kids: React.ReactNode[] = [];
  let ki = 0;
  const path = (d: string, attrs: React.SVGProps<SVGPathElement>) =>
    kids.push(<path key={`p${ki++}`} d={d} {...attrs} />);

  kids.push(<ellipse key="sh" cx={50} cy={103} rx={20} ry={3.4} fill="rgba(40,38,26,.13)" />);

  {
    // Dracaena — spiky fountain, red-orange edges.
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
