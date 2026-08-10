import type { Vitality } from '../lib/derive';
import { speciesLabel, speciesOr } from '../lib/species';

/**
 * The succulent — a pure function of (species, stage, vitality, size).
 *
 * Two independent dimensions (§5.2):
 *   stage 1–4  = size/fullness, from completed work. Never reduced by neglect.
 *   vitality   = colour, from days since activity. Reviving restores colour
 *                without losing stage.
 *
 * Species is the project's own choice and has nothing to do with either.
 *
 * The illustrations come in two states, not four. That matches how the rest of
 * the app reads vitality — `needsWater` is yellowing-or-worse — so the split
 * lands in the same place as the Today nudge and the neglect banner.
 */
function artFor(species: string, stage: number, vitality: Vitality): string {
  const level = Math.max(1, Math.min(4, Math.round(stage)));
  const state = vitality === 'yellowing' || vitality === 'browning' ? 'neglected' : 'healthy';
  return `${import.meta.env.BASE_URL}succulents/${species}-l${level}-${state}.png`;
}

export interface PlantProps {
  stage: number;
  vitality: Vitality;
  species: string;
  size?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
  title?: string;
}

export function Plant({ stage, vitality, species, size = 76, onClick, style, title }: PlantProps) {
  const id = speciesOr(species);
  const st = Math.max(1, Math.min(4, Math.round(stage)));

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
        src={artFor(id, st, vitality)}
        alt={`${speciesLabel(id)}, level ${st}, ${vitality}`}
        // contain, never crop — the pot and the bloom both matter, and the
        // illustrations aren't all the same aspect ratio.
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}
